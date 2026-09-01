const {
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  GOOGLE_ADS_CUSTOMER_ID
} = require('./config');
const { resolveGeoTargetConstant } = require('./geoMap');

let cachedToken = null;
let cachedTokenExpiry = 0;

// Replaces n8n's googleOAuth2Api credential: refresh-token grant, cached until near expiry.
async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry - 60_000) return cachedToken;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_ADS_CLIENT_ID,
      client_secret: GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error('GOOGLE_OAUTH_ERROR: ' + JSON.stringify(json));

  cachedToken = json.access_token;
  cachedTokenExpiry = Date.now() + json.expires_in * 1000;
  return cachedToken;
}

async function callGoogleAds(endpoint, body) {
  const token = await getAccessToken();
  const res = await fetch(
    `https://googleads.googleapis.com/v22/customers/${GOOGLE_ADS_CUSTOMER_ID}:${endpoint}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': GOOGLE_ADS_LOGIN_CUSTOMER_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error('GOOGLE_ADS_API_ERROR: ' + JSON.stringify(json));
  return json;
}

// Mirrors "Call Google Keyword Ideas".
async function generateKeywordIdeas(seedKeywords, location) {
  const geo = resolveGeoTargetConstant(location);
  return callGoogleAds('generateKeywordIdeas', {
    keywordSeed: { keywords: seedKeywords.split(',').map((k) => k.trim()) },
    language: 'languageConstants/1000',
    geoTargetConstants: geo ? [geo] : [],
    keywordPlanNetwork: 'GOOGLE_SEARCH',
    includeAdultKeywords: false
  });
}

// Mirrors "Call Google Historical Metrics".
async function generateHistoricalMetrics(keywords, location) {
  const geo = resolveGeoTargetConstant(location);
  return callGoogleAds('generateKeywordHistoricalMetrics', {
    keywords: keywords.split(',').map((k) => k.trim()),
    geoTargetConstants: geo ? [geo] : [],
    keywordPlanNetwork: 'GOOGLE_SEARCH'
  });
}

module.exports = { generateKeywordIdeas, generateHistoricalMetrics };
