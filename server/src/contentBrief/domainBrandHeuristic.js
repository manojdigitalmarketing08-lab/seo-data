// Sites that legitimately rank #1 for generic category queries and would
// otherwise risk false-flagging the query itself as "branded" if their name
// ever happened to overlap with a query's leading word.
const GENERIC_CONTENT_DOMAINS = new Set([
  'g2', 'capterra', 'softwareadvice', 'trustpilot', 'wikipedia', 'reddit',
  'youtube', 'forbes', 'techradar', 'pcmag', 'businessinsider', 'medium',
  'gartner', 'getapp', 'producthunt', 'quora', 'wired', 'zapier'
]);

function extractDomainRoot(domain) {
  if (!domain) return null;
  const parts = domain.replace(/^www\./, '').split('.');
  return parts.length ? parts[0].toLowerCase() : null;
}

// Real-world signal Knowledge Graph can miss entirely: if the top organic
// result for a query is that domain's own product page (the domain's root
// name equals the query's leading word), it's almost certainly a
// navigational/brand query, not a topic — this is what caught "zoho projects"
// (top result: zoho.com/projects/) after Knowledge Graph found nothing at all
// for "zoho". Requires an exact leading-word match (not substring) and a
// distinctive-enough domain name (length >= 4, not a known content/aggregator
// site) to avoid false-flagging a generic topic term whose top-ranking page
// just happens to live on a similarly-named domain.
function isDomainBrandMatch(queryText, serpResult) {
  if (!serpResult || !serpResult.configured || serpResult.results.length === 0) return false;

  const topDomain = extractDomainRoot(serpResult.results[0].domain);
  if (!topDomain || topDomain.length < 4 || GENERIC_CONTENT_DOMAINS.has(topDomain)) return false;

  const firstWord = queryText.toLowerCase().trim().split(/\s+/)[0];
  return firstWord === topDomain;
}

module.exports = { isDomainBrandMatch };
