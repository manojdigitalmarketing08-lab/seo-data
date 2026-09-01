# SEO Keyword API — standalone server

Replaces every n8n workflow that was hosted on `n8n-oyaw.onrender.com` (free tier,
restarts under load). Same Supabase project, same gating/caching/quota logic,
plain Node/Express instead of n8n.

## Workflow → file map

| n8n workflow | Replaced by |
|---|---|
| `Get Keyword Ideas (Gated)` | `POST /api/keyword-ideas` (`src/routes/keywordIdeas.js`) |
| `Get Historical Keyword Metrics (Gated)` | `POST /api/historical-metrics` (`src/routes/historicalMetrics.js`) |
| `Get PageSpeed Insights (Gated)` | `POST /api/pagespeed` (`src/routes/pagespeed.js`) |
| `Dashboard Search API` | `POST /dashboard-search-keywords` (`src/routes/dashboardSearch.js`) |
| `Reset Monthly Quotas` | daily cron in `src/index.js` → `src/cron/resetQuotas.js` |
| `Rate Limit Monitor` | hourly cron in `src/index.js` → `src/cron/rateLimitMonitor.js` |
| `Paddle Webhook Handler` | `POST /webhooks/paddle` (`src/routes/paddleWebhook.js`) — now with real signature verification, which the n8n version never had |
| *(new — n8n never had this)* | `POST /mcp` (`src/routes/mcp.js` + `src/mcp/server.js`) — a real Model Context Protocol server, matching `index.html`'s documented client config |

Shared gating/caching/quota logic (`Validate API Key` → `Gate Check` → `Check Cache`
→ live call → `Save To Cache` → `Increment Quota` → `Log Cache Hit/Miss`) lives once
in `src/gate.js` + `src/gatedTool.js` instead of being copy-pasted across 4 workflows.
Both the REST routes and the MCP tools call it, so gating behavior is identical
across every access channel.

## MCP server (`src/mcp/server.js`, `src/routes/mcp.js`)

`index.html` has always documented connecting via:

```json
{
  "mcpServers": {
    "seo-keyword-api": {
      "url": "https://YOUR-MCP-ENDPOINT/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

That endpoint now exists and does what the docs claim, via the official
`@modelcontextprotocol/sdk` (Streamable HTTP transport, stateless mode — a fresh
`McpServer` + transport per request, no session store to manage). It exposes three
tools that match `index.html`'s "Available Tools" section exactly:

- `get_keyword_ideas` — `{ keyword, country? }`
- `get_historical_keyword_metrics` — `{ keywords: string[], country? }`
- `get_pagespeed_insights` — `{ url, strategy?: "mobile" | "desktop" }`

The caller's API key travels in the `Authorization: Bearer <apiKey>` header (never
as a tool argument), extracted once per HTTP request and used for every tool call
in that request via `runGatedTool` — same validate/cache/quota/log path as the REST
routes. A gate failure (bad key, inactive account, quota exceeded) comes back as an
MCP tool error (`isError: true` in the JSON-RPC result) rather than an HTTP error,
since the MCP connection itself is fine — only that particular call failed.

Missing `Authorization` header entirely is rejected before any MCP handshake happens
(HTTP 401), since there's no legitimate use of the connection without a key.

**Limitation carried over from the REST routes:** keyword language is hardcoded to
English (`languageConstants/1000` in `src/googleAds.js`) — there's no `language`
tool argument yet even though it'd be easy to add if a customer asks for it.

## Security layer (`src/security.js`)

The n8n webhooks had no protection beyond the per-customer monthly quota. This
server adds a layer independent of that:

- **Helmet** — standard security headers (locked-down CSP, `X-Content-Type-Options`, etc.) on every response.
- **General rate limit** — 60 requests/minute per IP across the whole API.
- **Per-API-key rate limit** — 30 requests/minute keyed by `apiKey` (from the JSON body on REST routes, from the `Authorization` header on `/mcp`; falling back to IP if neither is present) on every gated route. This is what actually matters: it slows down someone brute-forcing keys or hammering the API from many IPs with one stolen key, which per-IP limiting alone can't catch.
- **Paddle webhook signature verification** (`src/routes/paddleWebhook.js`) — the n8n version accepted any POST to its webhook URL with no verification at all. This one validates the `Paddle-Signature` header (HMAC-SHA256) once `PADDLE_WEBHOOK_SECRET` is set.
- **JSON body size cap** (20kb) to reject oversized payloads before they're parsed.
- **CORS scoping** — the paid tool routes (`/api/*`) and `/mcp` don't set any CORS headers at all (they're meant for server-to-server/MCP callers, not browsers). Only `/dashboard-search-keywords` gets CORS, controlled by `ALLOWED_DASHBOARD_ORIGIN` (defaults to `*`, tighten once the dashboard has a real domain).

None of this replaces the per-customer quota in Supabase — it's a second, independent layer in front of it.

## Setup

```bash
cd server
npm install
cp .env.example .env   # fill in real values
npm start
```

Required env vars (see `.env.example`):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — same Supabase project (`pcmsotnmkxeriapajyco`), service_role key (same privilege level as the `rsl` n8n credential — bypasses RLS by design).
- `GOOGLE_ADS_CLIENT_ID` / `_CLIENT_SECRET` / `_REFRESH_TOKEN` — the OAuth2 app + refresh token behind n8n's `keyword` credential. Get these from Google Cloud Console (OAuth client) + a one-time OAuth consent flow to mint the refresh token.
- `GOOGLE_ADS_DEVELOPER_TOKEN` — same token used in the n8n workflows (it was redacted from the committed workflow JSON as `REPLACE_ME_GOOGLE_ADS_DEV_TOKEN`; the real value is only in your original n8n instance now).
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (`7368807029`) / `GOOGLE_ADS_CUSTOMER_ID` (`2956427596`) — unchanged from the workflows.
- `PAGESPEED_API_KEY` — same key used by the `PageSpeed_Insights` Query Auth credential.
- `PADDLE_API_KEY`, `PADDLE_API_BASE`, `PADDLE_WEBHOOK_SECRET` — optional until you finish Paddle wiring (see HANDOFF.md). Leave blank and `/webhooks/paddle` just skips signature checks and Paddle API calls will fail loudly if actually invoked.
- `SLACK_WEBHOOK_URL` — optional; the rate-limit monitor posts here instead of only logging, since there's no n8n execution history to check anymore.

## Deploying (avoiding the original hosting problem)

The reason you had to leave n8n was Render's **free tier** restarting under load —
that's a hosting-tier problem, not an n8n-specific one, so pick a host/tier that
doesn't sleep:

- **Render** — same platform, but a paid Web Service (no sleep, no cold restarts under load).
- **Railway** — usage-based, no free-tier sleep.
- **Fly.io** — free allowance but doesn't sleep the same way; needs `fly.toml` (not included here).

Any of these: point them at this `server/` directory, build command `npm install`,
start command `npm start`, and set the env vars above in the host's dashboard
(never commit `.env` — the repo is public).

Cron jobs run **inside the same Node process** via `node-cron`, so as long as the
process stays up (which is the whole point of picking a non-sleeping tier), no
separate cron infrastructure is needed. If you'd rather run them as the host's
native scheduled jobs instead, `resetOverdueQuotas()` and `checkRateLimit()` are
plain exported async functions in `src/cron/` you can call from a standalone script.

## Talking to it

**REST** (`/api/*`, `/dashboard-search-keywords`): POST JSON with `apiKey` + the
tool's fields, get back `{ ok, source: "cache"|"live", result }` or
`{ ok: false, code, message }` on gate failures (`INVALID_API_KEY` 401,
`ACCOUNT_INACTIVE` 403, `QUOTA_EXCEEDED` 429, `INVALID_INPUT` 400).

**MCP** (`/mcp`): point any MCP client (Claude, ChatGPT, Cursor) at
`https://YOUR-DEPLOYED-URL/mcp` with `Authorization: Bearer YOUR_API_KEY` — see
the "MCP server" section above. This is the config `index.html` already shows
customers; once deployed, paste your real URL into that `YOUR-MCP-ENDPOINT`
placeholder there.

Update `signup.html`/`upgrade.html`/any dashboard frontend to point at this
server's URL instead of the retired n8n webhook URLs.
