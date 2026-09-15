const { generateSeeds } = require('./seedExpansion');
const { clusterKeywords } = require('./cluster');
const { generateKeywordIdeas } = require('../googleAds');
const { searchTopResults } = require('../customSearch');
const { checkBrandTerm, isConfigured: brandFilterConfigured } = require('../knowledgeGraph');
const { isDomainBrandMatch } = require('./domainBrandHeuristic');
const { getCachedSignal, saveCachedSignal } = require('./signalCache');

const QUESTION_RE = /^(who|what|why|how|does|do|is|are|can|will)\b/i;

// How many of the top-opportunity clusters get returned in full and considered
// for primary/secondary. Google Ads' "ideas" expansion routinely returns
// thousands of loosely-related results — returning all of them isn't a brief,
// it's a data dump, and defeats the point of this being an "answer" tool.
const MAX_CLUSTERS_RETURNED = 20;
const MAX_SECONDARY = 6;
const MAX_BRAND_CHECKS = 20;

// State limitations, don't hide them — same principle as the
// seo-keyword-page-planner skill this feature is modeled on.
function buildKnownLimitations({ brandFilterStatus, excludedBrandCount, checkedCount, workingCount, domainMatchCount }) {
  let brandFilterNote;
  if (brandFilterStatus === 'not_configured') {
    brandFilterNote =
      'Brand/competitor filtering is unavailable (no Knowledge Graph API key configured) — review the keyword list yourself and drop named-competitor queries manually.';
  } else if (brandFilterStatus === 'failed') {
    brandFilterNote = `Brand/competitor filtering (Knowledge Graph signal) attempted but failed for all ${checkedCount} checked candidates (API error — check server logs) — a live-SERP domain-match signal still ran independently and caught ${domainMatchCount} term(s), but review the list yourself too.`;
  } else {
    brandFilterNote = `Brand/competitor filtering checked the top ${checkedCount} candidates two ways — Google Knowledge Graph (${workingCount} checks succeeded) and a live-SERP domain-match signal (catches brands Knowledge Graph doesn't recognize, e.g. names with no Knowledge Graph entry at all) — together excluding ${excludedBrandCount} likely branded term(s). This is best-effort, not exhaustive; review the remaining list for names neither signal caught.`;
  }

  return [
    'Search volume and competition come from Google Ads auction data, not organic ranking difficulty — a low ad-competition keyword can still have a highly competitive organic SERP.',
    'Volume is bucketed/rounded by Google for lower-volume terms; treat exact long-tail figures as directional, not precise.',
    'Clustering groups keywords by shared significant words, not full semantic/SERP-based clustering — review clusters before finalizing a brief.',
    'No Google Search Console integration yet — this brief surfaces fresh keyword opportunities only, not queries your specific site already ranks for.',
    brandFilterNote,
    '"Currently ranking" data comes from a third-party SERP API (Serper.dev), cost-controlled to the top brand-check/primary/secondary candidates, not every clustered keyword.',
    `Only the top ${MAX_CLUSTERS_RETURNED} keyword clusters by opportunity are returned in full, out of however many Google's ideas expansion produced.`
  ];
}

function scoreIdea(idea) {
  const metrics = idea.keywordIdeaMetrics || {};
  const volume = Number(metrics.avgMonthlySearches || 0);
  const competitionIndex = Number(metrics.competitionIndex || 0);
  // Same formula as the seo-keyword-page-planner skill: a rough sort, not ground truth.
  const opportunity = Math.round((volume / (competitionIndex + 1)) * 100) / 100;
  return { text: idea.text, volume, competition: metrics.competition || 'UNSPECIFIED', competitionIndex, opportunity };
}

function capitalize(text) {
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// Three layers of reuse, cheapest first: in-memory (this one request) ->
// cross-request Supabase cache (this keyword seen in ANY previous brief,
// any topic) -> live Knowledge Graph + Serper.dev calls. A keyword like
// "zoho projects" only ever pays for a live check once, ever, across every
// customer and every topic that surfaces it as a candidate.
async function getOrFetchSignals(text, requestCache) {
  if (requestCache.has(text)) return requestCache.get(text);

  const cached = await getCachedSignal(text);
  if (cached) {
    const bundle = {
      kg: { flagged: cached.kg_flagged, ok: cached.kg_ok },
      serp: cached.serp_result || { configured: false, results: [] }
    };
    requestCache.set(text, bundle);
    return bundle;
  }

  const [kg, serp] = await Promise.all([
    checkBrandTerm(text),
    (async () => {
      try {
        return await searchTopResults(text, 5);
      } catch (err) {
        return { configured: true, results: [], error: err.message };
      }
    })()
  ]);

  const bundle = { kg, serp };
  requestCache.set(text, bundle);
  await saveCachedSignal(text, { kgFlagged: kg.flagged, kgOk: kg.ok, serpResult: serp });
  return bundle;
}

// Checks only the top-opportunity candidates (not the whole result set) with
// two independent signals: Knowledge Graph entity type, and a live-SERP
// domain-match heuristic (catches brands with no Knowledge Graph presence at
// all, e.g. Zoho — confirmed via live testing to have zero KG entries).
async function filterBrandTerms(scoredItems, requestCache) {
  const sorted = [...scoredItems].sort((a, b) => b.opportunity - a.opportunity);
  const toCheck = sorted.slice(0, MAX_BRAND_CHECKS);

  const bundles = await Promise.all(toCheck.map((k) => getOrFetchSignals(k.text, requestCache)));
  const domainFlags = toCheck.map((k, i) => isDomainBrandMatch(k.text, bundles[i].serp));
  const excluded = toCheck.filter((_, i) => bundles[i].kg.flagged || domainFlags[i]);
  const excludedTexts = new Set(excluded.map((k) => k.text));

  return {
    kept: scoredItems.filter((k) => !excludedTexts.has(k.text)),
    excluded,
    checkedCount: toCheck.length,
    workingCount: bundles.filter((b) => b.kg.ok).length,
    domainMatchCount: domainFlags.filter(Boolean).length
  };
}

async function buildContentBrief({ topic, location, intent }) {
  const seeds = generateSeeds(topic, intent);
  const raw = await generateKeywordIdeas(seeds.join(','), location);
  const scoredAll = (raw.results || []).map(scoreIdea).filter((k) => k.volume > 0);

  if (scoredAll.length === 0) {
    return {
      topic,
      location: location || 'India',
      intent: intent || null,
      warning: 'No keyword ideas with search volume were found for this topic/location.',
      clusters: [],
      primary: null,
      secondary: [],
      faq: [],
      titleTag: null,
      metaDescription: null,
      currentlyRanking: {},
      excludedBrandTerms: [],
      knownLimitations: buildKnownLimitations({
        brandFilterStatus: brandFilterConfigured ? 'failed' : 'not_configured',
        excludedBrandCount: 0,
        checkedCount: 0,
        workingCount: 0,
        domainMatchCount: 0
      })
    };
  }

  const requestCache = new Map();
  const {
    kept: scored,
    excluded: excludedBrandTerms,
    checkedCount,
    workingCount,
    domainMatchCount
  } = await filterBrandTerms(scoredAll, requestCache);
  const brandFilterStatus = !brandFilterConfigured ? 'not_configured' : workingCount > 0 ? 'ok' : 'failed';

  const allClusters = clusterKeywords(scored).sort((a, b) => b.items[0].opportunity - a.items[0].opportunity);
  const totalClustersFound = allClusters.length;
  const totalKeywordsScored = scoredAll.length;
  const clusters = allClusters.slice(0, MAX_CLUSTERS_RETURNED);

  const primary = clusters[0].items[0];
  const secondaryClusters = clusters.slice(1, 1 + MAX_SECONDARY);
  const secondary = secondaryClusters.map((c) => c.items[0]);

  const usedTexts = new Set([primary.text, ...secondary.map((s) => s.text)]);
  const faq = scored
    .filter((k) => QUESTION_RE.test(k.text) && !usedTexts.has(k.text))
    .sort((a, b) => b.opportunity - a.opportunity)
    .slice(0, 8);

  // Reuses requestCache (and the cross-brief Supabase cache behind it) from
  // the brand-filtering pass where possible — primary/secondary almost always
  // come from within the checked candidate pool, so this rarely triggers a
  // fresh (billed) Serper.dev call.
  const currentlyRanking = {};
  for (const kw of [primary, ...secondary]) {
    const bundle = await getOrFetchSignals(kw.text, requestCache);
    currentlyRanking[kw.text] = bundle.serp;
  }

  return {
    topic,
    location: location || 'India',
    intent: intent || null,
    titleTag: truncate(capitalize(primary.text), 60),
    metaDescription: truncate(
      `Explore ${primary.text}${secondary[0] ? ' and ' + secondary[0].text : ''} — what to know before you choose.`,
      155
    ),
    h1: capitalize(primary.text),
    primary,
    secondary,
    h2s: secondary.map((s) => capitalize(s.text)),
    faq,
    clusters: clusters.map((c) => ({ representative: c.items[0].text, keywords: c.items })),
    totalClustersFound,
    totalKeywordsScored,
    currentlyRanking,
    excludedBrandTerms: excludedBrandTerms.map((k) => k.text),
    knownLimitations: buildKnownLimitations({
      brandFilterStatus,
      excludedBrandCount: excludedBrandTerms.length,
      checkedCount,
      workingCount,
      domainMatchCount
    })
  };
}

module.exports = { buildContentBrief };
