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
