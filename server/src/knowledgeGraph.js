const { PAGESPEED_API_KEY } = require('./config');

// Knowledge Graph Search API is a plain Google API key call, unlike SERP
// lookups (which now go through Serper.dev — see customSearch.js) — reuse
// the PageSpeed key rather than requiring a dedicated one, since Google API
// keys are typically shared across several enabled APIs on one project.
const apiKey = PAGESPEED_API_KEY;

const BRAND_TYPES = new Set([
  'Organization', 'Corporation', 'Brand', 'Product', 'SoftwareApplication', 'MobileApplication', 'WebSite'
]);
const MIN_BRAND_SCORE = 50;

// Best-effort brand/competitor detection for content-brief candidates: if a
// keyword phrase itself resolves strongly to a named Organization/Product in
// Google's Knowledge Graph (e.g. "zoho projects"), it's very likely someone
// searching for that specific competitor's product, not a generic topic —
// ranking for it takes brand-building, not on-page SEO (same reasoning as the
// seo-keyword-page-planner skill's "strip competitor/brand names first" step).
//
// Returns { flagged, ok } rather than a plain boolean — `ok: false` means the
// check itself failed (missing key, wrong API enabled on the key, network
// error), which must NOT be reported the same as "checked, not a brand."
// Silently collapsing those two cases is what let this run with a fully
// broken filter and report "0 excluded" as if filtering had worked.
async function checkBrandTerm(query) {
  if (!apiKey) return { flagged: false, ok: false, reason: 'no_api_key' };

  try {
    const params = new URLSearchParams({ query, key: apiKey, limit: '1', indent: 'False' });
    const res = await fetch(`https://kgsearch.googleapis.com/v1/entities:search?${params.toString()}`);

    if (!res.ok) {
      const body = await res.text();
      console.error('KNOWLEDGE_GRAPH_ERROR', res.status, body.slice(0, 300));
      return { flagged: false, ok: false, reason: 'api_error' };
    }

    const json = await res.json();
    const top = json.itemListElement && json.itemListElement[0];
    if (!top || !top.result) return { flagged: false, ok: true };

    // resultScore doesn't discriminate "generic" from "specific" within the
    // same magnitude a competing generic Thing-type match would score (a
    // score of 192,692 for "project management software" vs 2,943 for the
    // real "Asana, Inc." match) — but a plain >0 floor let through fuzzy
    // near-zero-confidence noise (e.g. "cloud project management software"
    // matching "Microsoft Azure" at score 1.97). MIN_BRAND_SCORE sits well
    // above observed noise (<2) and well below a real match (~2900+),
    // calibrated from live testing, not a documented API guarantee.
    const types = top.result['@type'] || [];
    const score = top.resultScore || 0;
    return { flagged: score >= MIN_BRAND_SCORE && types.some((t) => BRAND_TYPES.has(t)), ok: true };
  } catch (err) {
    console.error('KNOWLEDGE_GRAPH_ERROR', err.message);
    return { flagged: false, ok: false, reason: 'exception' };
  }
}

module.exports = { checkBrandTerm, isConfigured: Boolean(apiKey) };
