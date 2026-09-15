const { SERPER_API_KEY } = require('./config');

// Live SERP data for the "currently ranking" section of a content brief — the
// one gap Keyword Planner data structurally cannot see (organic difficulty,
// who's actually ranking). Uses Serper.dev rather than Google's own Custom
// Search JSON API: confirmed via live testing against two separate API
// keys/projects that Google no longer grants that API to new Cloud projects
// (a policy restriction, not a config problem) — see git history for the
// dead-end investigation. Degrades gracefully if SERPER_API_KEY isn't set.
async function searchTopResults(query, num = 5) {
  if (!SERPER_API_KEY) {
    return { configured: false, results: [] };
  }

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: query, num: Math.min(num, 10) })
  });

  const json = await res.json();
  if (!res.ok) throw new Error('SERPER_API_ERROR: ' + JSON.stringify(json));

  const results = (json.organic || []).slice(0, num).map((item) => ({
    title: item.title,
    link: item.link,
    domain: (() => {
      try {
        return new URL(item.link).hostname;
      } catch {
        return null;
      }
    })(),
    snippet: item.snippet
  }));

  return { configured: true, results };
}

module.exports = { searchTopResults };
