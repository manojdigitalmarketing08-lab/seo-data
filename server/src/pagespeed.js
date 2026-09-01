const { PAGESPEED_API_KEY } = require('./config');

// Mirrors "Call PageSpeed Insights".
async function runPagespeed(url, strategy) {
  if (!PAGESPEED_API_KEY) throw new Error('PAGESPEED_API_KEY is not configured');

  const params = new URLSearchParams({
    url,
    strategy: (strategy || 'mobile').toLowerCase().trim(),
    key: PAGESPEED_API_KEY
  });
  ['performance', 'seo', 'accessibility', 'best-practices'].forEach((c) => params.append('category', c));

  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`);
  const json = await res.json();
  if (!res.ok) throw new Error('PAGESPEED_API_ERROR: ' + JSON.stringify(json));
  return json;
}

module.exports = { runPagespeed };
