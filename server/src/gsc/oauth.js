const crypto = require('crypto');
const { supabase } = require('../supabase');
const { encrypt, decrypt } = require('./tokenCrypto');
const {
  GSC_OAUTH_CLIENT_ID,
  GSC_OAUTH_CLIENT_SECRET,
  GSC_OAUTH_REDIRECT_URI,
  OAUTH_STATE_SECRET
} = require('../config');

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

const STATE_TTL_MS = 10 * 60 * 1000;

// Signed, stateless `state` param — no DB row needed. Format: customerId.nonce.expiry.signature
function signState(customerId) {
  const nonce = crypto.randomBytes(8).toString('hex');
  const expiry = Date.now() + STATE_TTL_MS;
  const payload = `${customerId}.${nonce}.${expiry}`;
  const signature = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
}

// Returns the customerId if the state is valid and unexpired, otherwise null.
function verifyState(state) {
  let decoded;
  try {
    decoded = Buffer.from(state, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const parts = decoded.split('.');
  if (parts.length !== 4) return null;
  const [customerId, nonce, expiry, signature] = parts;
  const payload = `${customerId}.${nonce}.${expiry}`;
  const expected = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  if (Date.now() > Number(expiry)) return null;
  return customerId;
}

function getAuthUrl(customerId) {
  const state = signState(customerId);
  const params = new URLSearchParams({
    client_id: GSC_OAUTH_CLIENT_ID,
    redirect_uri: GSC_OAUTH_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GSC_OAUTH_CLIENT_ID,
      client_secret: GSC_OAUTH_CLIENT_SECRET,
      redirect_uri: GSC_OAUTH_REDIRECT_URI,
      code,
      grant_type: 'authorization_code'
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error('GSC_OAUTH_EXCHANGE_ERROR: ' + JSON.stringify(json));
  if (!json.refresh_token) {
    throw new Error(
      'GSC_OAUTH_NO_REFRESH_TOKEN: Google did not return a refresh token — the account may already have an ' +
        'active grant without prompt=consent taking effect. Try disconnecting the app at ' +
        'https://myaccount.google.com/permissions and reconnecting.'
    );
  }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${json.access_token}` }
  });
  const userJson = await userRes.json();
  if (!userRes.ok) throw new Error('GSC_OAUTH_USERINFO_ERROR: ' + JSON.stringify(userJson));

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    scope: json.scope,
    email: userJson.email
  };
}

async function saveConnection(customerId, { googleEmail, refreshToken, scope }) {
  const { error } = await supabase.from('gsc_connections').upsert(
    {
      customer_id: customerId,
      google_email: googleEmail,
      refresh_token_encrypted: encrypt(refreshToken),
      scope,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'customer_id' }
  );
  if (error) throw new Error('GSC_CONNECTION_SAVE_ERROR: ' + error.message);
}

async function deleteConnection(customerId) {
  const { error } = await supabase.from('gsc_connections').delete().eq('customer_id', customerId);
  if (error) throw new Error('GSC_CONNECTION_DELETE_ERROR: ' + error.message);
}

async function getConnection(customerId) {
  const { data, error } = await supabase
    .from('gsc_connections')
    .select('google_email, connected_at, refresh_token_encrypted')
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw new Error('GSC_CONNECTION_FETCH_ERROR: ' + error.message);
  return data;
}

// In-memory access-token cache, keyed by customerId — same pattern as
// googleAds.js's module-level cachedToken, just per-customer instead of global.
const accessTokenCache = new Map(); // customerId -> { token, expiry }

async function getAccessTokenForCustomer(customerId) {
  const cached = accessTokenCache.get(customerId);
  if (cached && Date.now() < cached.expiry - 60_000) return cached.token;

  const connection = await getConnection(customerId);
  if (!connection) {
    const err = new Error('No Search Console connection for this customer');
    err.code = 'GSC_NOT_CONNECTED';
    throw err;
  }

  const refreshToken = decrypt(connection.refresh_token_encrypted);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GSC_OAUTH_CLIENT_ID,
      client_secret: GSC_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error('GSC_OAUTH_REFRESH_ERROR: ' + JSON.stringify(json));

  accessTokenCache.set(customerId, { token: json.access_token, expiry: Date.now() + json.expires_in * 1000 });
  return json.access_token;
}

module.exports = {
  getAuthUrl,
  verifyState,
  exchangeCodeForTokens,
  saveConnection,
  deleteConnection,
  getConnection,
  getAccessTokenForCustomer
};
