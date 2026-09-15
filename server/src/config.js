require('dotenv').config();

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name} (see .env.example)`);
  return val;
}

module.exports = {
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),

  GOOGLE_ADS_CLIENT_ID: required('GOOGLE_ADS_CLIENT_ID'),
  GOOGLE_ADS_CLIENT_SECRET: required('GOOGLE_ADS_CLIENT_SECRET'),
  GOOGLE_ADS_REFRESH_TOKEN: required('GOOGLE_ADS_REFRESH_TOKEN'),
  GOOGLE_ADS_DEVELOPER_TOKEN: required('GOOGLE_ADS_DEVELOPER_TOKEN'),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: required('GOOGLE_ADS_LOGIN_CUSTOMER_ID'),
  GOOGLE_ADS_CUSTOMER_ID: required('GOOGLE_ADS_CUSTOMER_ID'),

  PAGESPEED_API_KEY: process.env.PAGESPEED_API_KEY || '',

  // Search Console — per-customer OAuth (distinct from the static Google Ads
  // credential above: GSC data belongs to each customer's own verified
  // property, so every customer connects their own Google account).
  GSC_OAUTH_CLIENT_ID: required('GSC_OAUTH_CLIENT_ID'),
  GSC_OAUTH_CLIENT_SECRET: required('GSC_OAUTH_CLIENT_SECRET'),
  GSC_OAUTH_REDIRECT_URI: required('GSC_OAUTH_REDIRECT_URI'),
  GSC_POST_AUTH_REDIRECT_URL: process.env.GSC_POST_AUTH_REDIRECT_URL || '/dashboard.html',
  OAUTH_STATE_SECRET: required('OAUTH_STATE_SECRET'),
  TOKEN_ENCRYPTION_KEY: required('TOKEN_ENCRYPTION_KEY'),

  // Optional — powers the "currently ranking" section of /api/content-brief.
  // Google's Custom Search JSON API is closed to new Cloud projects (confirmed
  // via live testing against two separate keys/projects — not a config issue,
  // Google's own new-customer policy), so this uses Serper.dev instead: get a
  // key at https://serper.dev (2,500 free queries, then pay-as-you-go).
  SERPER_API_KEY: process.env.SERPER_API_KEY || '',

  PADDLE_API_KEY: process.env.PADDLE_API_KEY || '',
  PADDLE_API_BASE: process.env.PADDLE_API_BASE || 'https://sandbox-api.paddle.com',
  PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET || '',

  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || '',

  // Comma-separated list of origins allowed to call /dashboard-search-keywords from
  // a browser, or '*' for any origin (fine for a public, no-login endpoint). The
  // paid tool routes (/api/*) don't use CORS at all — they're server-to-server callers.
  ALLOWED_DASHBOARD_ORIGIN: process.env.ALLOWED_DASHBOARD_ORIGIN || '*',

  PORT: process.env.PORT || 3000
};
