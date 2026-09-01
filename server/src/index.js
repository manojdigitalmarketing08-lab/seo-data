const { PORT } = require('./config');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const {
  helmetMiddleware,
  generalLimiter,
  gatedToolLimiter,
  mcpLimiter,
  dashboardCorsOptions
} = require('./security');

const keywordIdeasRoute = require('./routes/keywordIdeas');
const historicalMetricsRoute = require('./routes/historicalMetrics');
const pagespeedRoute = require('./routes/pagespeed');
const dashboardSearchRoute = require('./routes/dashboardSearch');
const paddleWebhookRoute = require('./routes/paddleWebhook');
const mcpRoute = require('./routes/mcp');
const { resetOverdueQuotas } = require('./cron/resetQuotas');
const { checkRateLimit } = require('./cron/rateLimitMonitor');

const app = express();

// Needed for correct client IPs (and therefore correct rate limiting) behind
// Render/Railway/Fly's reverse proxy.
app.set('trust proxy', 1);

app.use(helmetMiddleware);

// Mounted before express.json() because Paddle signature verification needs the raw body.
app.use('/webhooks/paddle', paddleWebhookRoute);

app.use(express.json({ limit: '20kb' }));
app.use(generalLimiter);

app.get('/health', (req, res) => res.json({ ok: true }));

// Paid tool routes: no CORS (server-to-server / MCP callers, not browsers) +
// the stricter per-apiKey limiter on top of the general one.
app.use('/api/keyword-ideas', gatedToolLimiter, keywordIdeasRoute);
app.use('/api/historical-metrics', gatedToolLimiter, historicalMetricsRoute);
app.use('/api/pagespeed', gatedToolLimiter, pagespeedRoute);

// Public dashboard endpoint: open CORS (restrict via ALLOWED_DASHBOARD_ORIGIN once
// the dashboard frontend has a real domain) + the same per-apiKey limiter.
app.use('/dashboard-search-keywords', cors(dashboardCorsOptions), gatedToolLimiter, dashboardSearchRoute);

// The real MCP endpoint documented in index.html's client config — no CORS (MCP
// clients are not browsers) + the header-based per-apiKey limiter.
app.use('/mcp', mcpLimiter, mcpRoute);

app.listen(PORT, () => {
  console.log(`SEO Keyword API listening on port ${PORT}`);
});

// Daily 00:10 UTC — equivalent to the "Reset Monthly Quotas" schedule trigger.
cron.schedule(
  '10 0 * * *',
  () => {
    resetOverdueQuotas().catch((err) => console.error(err));
  },
  { timezone: 'UTC' }
);

// Hourly — equivalent to the "Rate Limit Monitor" schedule trigger.
cron.schedule('0 * * * *', () => {
  checkRateLimit().catch((err) => console.error(err));
});
