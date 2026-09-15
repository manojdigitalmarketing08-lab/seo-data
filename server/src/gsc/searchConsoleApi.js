// Thin fetch wrappers around the Search Console API — same shape as callGoogleAds
// in googleAds.js, but takes a per-customer access token instead of a static one.

async function listSites(accessToken) {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const json = await res.json();
  if (!res.ok) throw new Error('GSC_LIST_SITES_ERROR: ' + JSON.stringify(json));
  return json.siteEntry || [];
}

async function querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions, rowLimit }) {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: dimensions && dimensions.length ? dimensions : ['query'],
        rowLimit: rowLimit || 100
      })
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error('GSC_SEARCH_ANALYTICS_ERROR: ' + JSON.stringify(json));
  return json.rows || [];
}

module.exports = { listSites, querySearchAnalytics };
