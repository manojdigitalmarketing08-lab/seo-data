# SEO Keyword API — SaaS Build

A subscription-gated wrapper around Google Ads Keyword Planner + PageSpeed Insights, exposed as MCP tools and a browser dashboard. Backend runs as a standalone Node/Express service (moved off n8n — see below), on top of Supabase.

## Repo contents

**Live backend:** `server/` — a standalone Node/Express service that replaced the n8n instance this project originally ran on (`https://n8n-oyaw.onrender.com`, retired due to free-tier restarts under load). See `server/README.md` for the workflow → route map, setup, and deployment notes. It talks to the same Supabase project (`pcmsotnmkxeriapajyco`).

- `server/` — the live API: gated keyword/pagespeed tools, the dashboard search endpoint, quota-reset + rate-limit-monitor crons, and the Paddle webhook handler (now with real signature verification, plus a security layer: helmet headers, per-IP and per-API-key rate limiting)
- `signup.html` — static signup page, calls the `signup_customer` Supabase RPC directly (anon key, safe to embed client-side) — unaffected by the n8n → server move, always talked to Supabase directly
- `upgrade.html` — Paddle Checkout pricing page for Starter/Pro plans — also talks to Paddle directly client-side, unaffected
- `workflows/` — **historical** n8n workflow exports (importable JSON), kept for reference; no longer what's running in production
  - `get-keyword-ideas-gated.json`, `get-historical-keyword-metrics-gated.json`, `get-pagespeed-insights-gated.json` — superseded by `server/src/routes/{keywordIdeas,historicalMetrics,pagespeed}.js`
  - `dashboard-search-api.json` — superseded by `server/src/routes/dashboardSearch.js`
  - `reset-monthly-quotas.json` — superseded by `server/src/cron/resetQuotas.js`
  - `rate-limit-monitor.json` — superseded by `server/src/cron/rateLimitMonitor.js`
  - `paddle-webhook-handler.json` — superseded by `server/src/routes/paddleWebhook.js`
- `supabase/schema.sql` — base table definitions
- `supabase/migrations/` — applied migrations in order (RLS, signup RPC, Paddle column rename, monitoring views)

## Architecture notes

- **Auth model:** customers get an `api_key` (bearer token) from signup, no password/session system. RLS is enabled on all tables with zero broad anon policies — the only public write path is the `signup_customer` RPC, which is `SECURITY DEFINER` and returns only the fields a new signup needs.
- **Backend writes** (quota increments, cache writes, subscription updates) go through `server`'s `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS by design — same privilege level the old `rsl` n8n credential had.
- **Caching:** `keyword_cache` is keyed by normalized seed keywords + location, shared across all customers, to reduce load on the shared Google Ads account (single developer-token quota shared by every customer).
- **Payment provider:** Paddle (merchant-of-record), not Stripe — Stripe isn't available in the account owner's country, and Paddle supports USD billing without requiring a local Stripe account.
- **API security layer** (`server/src/security.js`): helmet security headers, a general per-IP rate limit, and a stricter per-API-key rate limit on every gated tool route — independent of and in addition to the per-customer monthly quota. Protects the shared Google Ads developer-token quota from a single bad actor even if they're spraying requests across many IPs or stolen keys.
- **Free dashboard demo:** `dashboardSearch.js` mirrors the gated `keywordIdeas.js` logic directly rather than importing it as a dependency — kept as a separate route (as it was a separate n8n workflow) since free-tier auto-provisioning logic will likely hang off this route specifically later.

## Known gaps

- No frontend yet consumes `POST /dashboard-search-keywords` — the backend route exists and is gated/cached, but there's no dashboard search UI calling it (see `server/README.md`).
- Paddle wiring is incomplete: needs `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, and real Price IDs for Starter/Pro in `upgrade.html` (currently placeholders marked `REPLACE_ME_*`).
- Pricing ($19/$49) is a placeholder, not validated against real cache-hit-rate economics.

## MCP support

`index.html` documents connecting via a `/mcp` endpoint — this is now real, not
just docs. `server/src/routes/mcp.js` + `server/src/mcp/server.js` implement an
actual Model Context Protocol server (Streamable HTTP, via the official
`@modelcontextprotocol/sdk`) exposing `get_keyword_ideas`,
`get_historical_keyword_metrics`, and `get_pagespeed_insights` as MCP tools,
gated through the same `runGatedTool` logic the REST routes use. See
`server/README.md`'s "MCP server" section for the details.
