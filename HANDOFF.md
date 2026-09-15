# SEO Keyword API — SaaS Build Handoff (Session 3)

**The architecture changed completely this session.** n8n is retired. The entire backend is now a standalone Node/Express service in `server/`. If you're picking this up cold, read this whole file before touching anything — Sessions 1–2's n8n-specific content below is historical only.

## Immediate blocker for next session

**The user reported "localhost cannot get" when trying to reach the dashboard/API from their own browser.** Root cause found and partially fixed: on this dev machine, `localhost` resolves to `::1` (IPv6) first, and the Node server isn't reachable there — confirmed directly: `curl http://localhost:3000/health` fails, `curl http://127.0.0.1:3000/health` succeeds.

**Fixed this session:** `assets/js/dashboard.js`'s `API_BASE_URL` changed from `http://localhost:3000` to `http://127.0.0.1:3000`.

**Not yet confirmed:** whether that fix actually resolves it for the user — this was done at the very end of the session, un-tested against their actual browser. **First thing next session: confirm with the user whether `dashboard.html` now loads data correctly**, or whether the IPv6 issue runs deeper (e.g. Windows Firewall blocking the port, antivirus interference, or something specific to their machine that a URL change alone doesn't fix).

## How to run it locally

```bash
cd server
npm install        # if not already done
npm start          # starts on port 3000
```

Then open `dashboard.html` directly in a browser (file:// URL works fine), or `dashboard.html?demo=1` for a mock-data preview with no backend needed.

**Caveat:** if you start the server via a Claude Code background task, it dies when that session/task ends — it is not a persistent service. Confirmed twice this session (server had to be restarted after two separate session boundaries). For anything longer-lived than one working session, the user should run `npm start` themselves in their own terminal, or the server should be deployed (see Not Yet Built).

## What's actually running (server/)

| Endpoint | Purpose |
|---|---|
| `POST /api/keyword-ideas` | Google Ads Keyword Planner ideas — gated |
| `POST /api/historical-metrics` | Historical keyword volume — gated |
| `POST /api/pagespeed` | PageSpeed Insights — gated |
| `POST /api/content-brief` | **New flagship feature** — see below |
| `POST /dashboard-search-keywords` | Public, no-login keyword search for the dashboard |
| `POST /api/account` | Dashboard account/quota lookup by apiKey |
| `POST /api/session-account` | Bridges a Supabase Auth session (see Discovered-not-audited below) to the apiKey model |
| `POST /webhooks/paddle` | Paddle billing webhook, with real signature verification |
| `POST /mcp` | **Real MCP server** (Streamable HTTP) — 3 tools: `get_keyword_ideas`, `get_historical_keyword_metrics`, `get_pagespeed_insights`, `get_content_brief` |
| Crons (in-process, `node-cron`) | Daily quota reset, hourly rate-limit monitor |

Full architecture, security layer, and MCP details are in `server/README.md` — kept up to date throughout this session, trust it over re-deriving from code.

## Content Brief — the flagship feature built this session

`POST /api/content-brief` (+ MCP tool `get_content_brief`) turns a topic into scored/clustered keyword opportunities, a page outline, and live SERP context — modeled directly on the `seo-keyword-page-planner` Claude skill's methodology (same `Opportunity = Volume / (Competition + 1)` formula).

**Pipeline:** seed expansion (template-based, multi-angle) → Google Ads keyword ideas → score → **dual-signal brand/competitor filtering** (Knowledge Graph entity check + live-SERP domain-match heuristic) → cluster (token-overlap) → select primary/secondary/FAQ → live "currently ranking" via Serper.dev → assemble brief.

**Two real quality bugs were caught by testing on real data, not just code review** — worth knowing if you touch this code:
1. Without a cluster cap, one real brief returned 1,179 clusters / 670KB — capped to top 20, with totals disclosed (`totalClustersFound`/`totalKeywordsScored`).
2. Knowledge Graph alone could **not** catch "zoho projects" as a branded term — Zoho has zero presence in Google's Knowledge Graph at all. Added a second signal (`domainBrandHeuristic.js`): if a candidate keyword's top live-SERP result is that domain's own page (domain root = query's leading word), it's flagged as branded. Both signals run together; a term needs only one to be excluded.

**Caching, two layers:**
- `keyword_cache` (pre-existing) — whole-brief cache, exact repeat of topic+location+intent only.
- `keyword_signal_cache` (**new table, migration `007`**) — per-keyword brand-check + SERP result, reused **across different topics**. Verified live: a keyword cached under one topic's brief was reused with its original timestamp intact when a completely different topic surfaced it again — zero new API calls.

**Known limitations, by design** (also returned in every API response under `knownLimitations` — don't silently hide these from users):
- No Google Search Console integration — can't see queries a specific site already ranks for.
- Brand filtering is best-effort, not exhaustive.
- Clustering is keyword-text overlap, not true semantic/SERP clustering.
- Only top 20 clusters returned in full.

## Real external-API gotchas hit this session — do not re-learn these the hard way

1. **Google Ads developer tokens bind permanently to whichever Google Cloud project makes their first successful API call.** Using a working developer token with a *different* OAuth client/project than the one it's already bound to fails with `DEVELOPER_TOKEN_PROHIBITED`, even if the token would otherwise work fine. Not fixable by resetting secrets or re-authing — only fix is either get the token already bound to your project, or make a brand-new project's first call with your token to bind them together. This cost most of a session to diagnose; if Google Ads calls start failing with this exact error after any credential change, this is why.
2. **Google's Custom Search JSON API no longer grants access to new Cloud projects at all** — confirmed via live testing against two separate fresh projects/keys, both blocked with `"This project does not have the access to Custom Search JSON API"` regardless of enabling the API or fixing key restrictions. This is a deliberate Google policy (existing customers grandfathered only, service being sunset ~2027). **Do not spend time debugging this error as a config issue** — it isn't one. We switched to **Serper.dev** instead (`SERPER_API_KEY` in `.env`) for all live-SERP needs.
3. **Knowledge Graph API `resultScore` doesn't reliably separate "generic" from "specific"** — a generic phrase can outscore a real branded match (192,692 vs 2,943 for a real product). The `@type` field (must include `Organization`/`Corporation`/`Brand`/`Product`/`SoftwareApplication`/etc.) does the real discriminating; score is only a floor to reject near-zero-confidence noise matches (calibrated to `50` in `knowledgeGraph.js`, from real observed noise at <2 and real matches at ~2900+).
4. **A CSS element that sets its own `display` property (flex/grid/block) silently overrides the browser's default `[hidden]{display:none}`** unless you also add an explicit `.your-class[hidden]{display:none}` rule. This exact bug was found live (via actual browser screenshots, not code review) in **two places**: `.gate-wrap` (pre-existing, not introduced this session) and `.brief-results` (introduced this session, same mistake). Both fixed. **If you add any new toggleable panel/section with its own `display` rule, check for this pattern immediately.**

## Dashboard (`dashboard.html`, `assets/js/dashboard.js`, `assets/css/dashboard.css`)

Built out significantly this session, verified live via Chrome DevTools MCP (screenshots + console checks, not just static review):

- **Content Brief tab** — new. Hero recommendation card, SEO snippet preview, page outline, FAQ, currently-ranking cards, excluded-brand chips, collapsible cluster table + known-limitations list.
- **Developer menu** — API key box + MCP connect snippet moved out of the main overview card/sidebar into a dropdown under a new "Developer" button in the topbar, per explicit user request to declutter. Had a positioning bug (dropdown overflowed off-screen) — fixed by anchoring to `.topbar-actions` instead of the button itself.
- **Keyword Explorer tab** — pre-existing, untouched.

**Demo mode** (`?demo=1`): shows static mock data regardless of input for both tabs — this is existing, intentional behavior (Keyword Explorer already worked this way), not a bug, though the user flagged confusion about it for Content Brief specifically. Offered to make it topic-aware; no decision made yet.

## Discovered, not fully audited — flag to the user before assuming it works

An email/password login flow exists in the working directory (`login.html`, `reset-password.html`, `server/src/routes/sessionAccount.js`) that bridges Supabase Auth sessions to the existing apiKey model. These are substantial, apparently complete files (600+ lines each) — **but they were not built in the visible portion of this session's conversation** (likely from an earlier compacted segment) and have not been tested or reviewed here. Before relying on or extending this flow, verify: does `login.html` actually work end-to-end against the current Supabase project? Is `/api/session-account` reachable and correct? Nobody has confirmed this in a session I have visibility into.

## Not yet built / outstanding

1. **Deployment.** The server has never run anywhere but `localhost`. Everything else (Paddle webhooks, MCP endpoint for real customers, `index.html`'s MCP config placeholder) is blocked on this.
2. **Paddle billing** — `PADDLE_API_KEY`/`PADDLE_WEBHOOK_SECRET` still blank in `.env`; `upgrade.html` still has placeholder Price IDs. No one can pay yet.
3. **PageSpeed Insights and Historical Metrics have no dashboard UI** — only Keyword Explorer and Content Brief do. Backend routes work fine, just unexposed in the dashboard.
4. **Full real user journey never run end-to-end** as one connected flow (signup → dashboard → real key → real tool call). Individual pieces tested in isolation.
5. GSC/GA4/URL Inspection tools remain deliberately ungated (unchanged from session 2).
6. Pricing ($19/$49) still unvalidated against real cache-hit-rate economics (unchanged from session 2).
7. The login/reset-password flow above needs a real audit.

## Test customer

- Email: `manoj.digitalmarketing08@gmail.com`
- API key: `c217fb8d2835986398b66c8f82026727d21e5a77f82f72f8`
- Plan: `pro`, quota: 1000/period (has real usage on it from this session's testing — don't be surprised by non-zero `quota_used_this_period`)

## Credentials status (`server/.env` — not committed, real values live only there)

| Credential | Status |
|---|---|
| Supabase URL + service role key | ✅ working |
| Google Ads OAuth client/secret/refresh token/developer token | ✅ working — bound to Cloud project `196541777409`, developer token from Ads account `306-523-9896`. **Do not swap any of these independently** — see gotcha #1 above. |
| `PAGESPEED_API_KEY` | ✅ working — also reused for Knowledge Graph API calls (same key, multiple APIs enabled) |
| `SERPER_API_KEY` | ✅ working |
| `PADDLE_API_KEY` / `PADDLE_WEBHOOK_SECRET` | ❌ blank |

## Superseded from Session 2 (historical only — n8n is retired)

Everything below this line describes the *retired* n8n-based system. Kept for historical reference only; do not act on it.

<details>
<summary>Session 2 content (n8n era, retired)</summary>

Continuation of the original build. Session 2: locked down RLS, added quota reset + rate-limit monitoring, built a public dashboard search API, replaced Stripe with Paddle, pushed everything to git — all on n8n (`https://n8n-oyaw.onrender.com`). Session 3 replaced this entire backend with the standalone Node server documented above because the n8n free tier restarted under load.

Git repo: `https://github.com/manojdigitalmarketing08-lab/seo-data` (public). The `workflows/*.json` exports in that repo are historical — superseded by `server/src/routes/*.js` and `server/src/cron/*.js` one-to-one (see `README.md`'s mapping table).

Bugs found in the n8n era (RLS view privileges, RETURNING needing SELECT policies, Execute Sub-workflow credential resolution, alwaysOutputData gaps, Code node error-message mangling, draft-vs-published confusion, Render free-tier restarts) are irrelevant now that n8n is gone, but are preserved in git history if ever useful.

</details>
