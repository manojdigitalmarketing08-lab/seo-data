const helmet = require('helmet');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { ALLOWED_DASHBOARD_ORIGIN } = require('./config');

// Applied globally in index.js. No inline scripts/styles are served by this API
// (it only returns JSON), so a locked-down default-src is safe.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'none'"] }
  }
});

// General ceiling per IP across the whole API — independent of the per-customer
// monthly quota enforced in gate.js. This is what actually protects the shared
// Google Ads developer-token quota from a single bad actor or runaway script,
// something the old n8n webhooks had no equivalent of.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, code: 'RATE_LIMITED', message: 'Too many requests, slow down.' }
});

// Tighter limiter specifically on the gated tool routes, keyed by apiKey when present
// (falls back to IP for requests with no/garbage apiKey) — slows down API-key brute-forcing
// far more than a plain per-IP limit would, since a single IP can hold many stolen keys
// and a single key can be hit from many IPs (e.g. via a botnet).
const gatedToolLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.body && req.body.apiKey) || ipKeyGenerator(req.ip),
  message: { ok: false, code: 'RATE_LIMITED', message: 'Too many requests for this API key, slow down.' }
});

// Same idea as gatedToolLimiter, but for the MCP endpoint where the apiKey travels
// in the Authorization header (per index.html's documented client config) rather
// than the JSON-RPC body.
const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.get('Authorization') || '';
    const match = auth.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : ipKeyGenerator(req.ip);
  },
  message: { ok: false, code: 'RATE_LIMITED', message: 'Too many requests for this API key, slow down.' }
});

// The dashboard-search endpoint is public/no-login by design, so it only gets the
// general limiter plus permissive CORS; the paid tool routes get neither wide-open
// CORS (they're server-to-server / MCP callers, not browsers) nor a public identity
// to key rate limits off of other than the apiKey itself.
const dashboardCorsOptions = {
  origin: ALLOWED_DASHBOARD_ORIGIN === '*' ? true : ALLOWED_DASHBOARD_ORIGIN.split(',').map((o) => o.trim()),
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
};

module.exports = { helmetMiddleware, generalLimiter, gatedToolLimiter, mcpLimiter, dashboardCorsOptions };
