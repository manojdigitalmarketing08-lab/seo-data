# SEO Keyword API — SaaS Build Handoff (Session 2)

Continuation of the original build. This session: locked down RLS, added quota reset + rate-limit monitoring, built a public dashboard search API, replaced Stripe with Paddle, and pushed everything to git. Read this before touching anything — several non-obvious bugs were found and fixed.

## Live infrastructure

**n8n instance:** `https://n8n-oyaw.onrender.com` — **runs on Render's free tier and restarts under heavy call volume.** Space out live testing; a sudden run of 503s/connection errors usually means the instance restarted, not that your logic is broken.

| Workflow | ID | Status | Purpose |
|---|---|---|---|
| `Get Keyword Ideas (Gated)` | `UFfD8HBtKyzymcag` | active | Paid API tool — unchanged logic, fixed this session (see bugs below) |
| `Get Historical Keyword Metrics (Gated)` | `qoYYOVFoFk5Axo31` | active | Same fix applied |
| `Get PageSpeed Insights (Gated)` | `svckRUYkrynO77FS` | active | Same fix applied |
| `Dashboard Search API` | `yxFP2h3ahFUWKdl1` | active | **New.** Public webhook wrapping keyword search for the browser dashboard — self-contained (does not call the workflow above as a sub-workflow, see bugs below) |
| `Reset Monthly Quotas` | `zlpiunnYyJmHqk2v` | active | **New.** Daily 00:10 UTC, idempotent |
| `Rate Limit Monitor` | `WY3TZ74yohOLEPMF` | active | **New.** Hourly, log-only (fails visibly in execution history over threshold) |
| `Paddle Webhook Handler` | `iEsmvSFmUKG6HgfV` | **inactive** | **New**, built but not wired up — needs a Paddle credential (see Not Yet Built) |
| `SEO Data MCP Server (GSC + Keyword Planner)` | `TFuwEZCHZmsnjuko` | active | Personal-use, ungated — untouched |
| `Page Content Audit` | `HtbPWazqahiPWbsm` | active | Untouched |
| ~~`Stripe Webhook Handler`~~ | `LHBGuRSk5vC9ER1s` | **archived** | Superseded by Paddle before ever going live — Stripe isn't available in the account owner's country |
| ~~`Dashboard Search API` (v1, broken)~~ | `QaQsSjcXouaajDfo` | **archived** | First attempt, called the gated workflow via Execute Sub-workflow — replaced due to unreliable credential resolution |

**Supabase project:** `pcmsotnmkxeriapajyco` (unchanged). Schema/migrations now version-controlled — see repo below.

**n8n credentials:**
- `rsl` (Supabase API, service_role) — used by every backend node that writes to Supabase, bypasses RLS by design
- `keyword` (`e3KWnwXqJQh1j4G9`, Google Ads OAuth2) — unchanged
- `console` (`bjFZuFmboFvnGUA2`, GSC OAuth2) — unchanged, do not swap with `keyword`
- `PageSpeed_Insights` (Query Auth) — unchanged
- **`Paddle`** — **not yet created.** Needs a Header Auth credential (`Authorization: Bearer <sandbox API key>`) before `Paddle Webhook Handler` can be activated

## Git repo

`https://github.com/manojdigitalmarketing08-lab/seo-data` — **public repo.** Pushed this session: `signup.html`, `upgrade.html`, all 7 active/inactive workflow JSON exports, `supabase/schema.sql` + 6 migrations, `README.md`.

⚠️ The Google Ads developer-token was **redacted** from the committed workflow JSON (`REPLACE_ME_GOOGLE_ADS_DEV_TOKEN`) since the repo is public — paste the real token back in if you ever re-import these files into n8n. The real token still lives safely in the live n8n workflows themselves, only the git copies are redacted.

Two workflows were **not exported** (kept the n8n call budget down per the Render free-tier note): `SEO Data MCP Server` and `Page Content Audit`. Export them the same way (`get_workflow_details` → write JSON) if you want them version-controlled too.

An untracked `index.html` (~48KB) appeared in the project directory during this session that **I did not create** — not part of this work, origin unknown. Worth checking with the user before assuming it's related to this project.

## What changed this session

1. **RLS enabled** on `customers`, `keyword_cache`, `usage_log` — anon key can no longer read any customer data (previously full CRUD, per original handoff's top-priority flag).
2. **Public signup rebuilt** as a `SECURITY DEFINER` RPC (`signup_customer`) instead of a raw table INSERT — necessary because Postgres requires a SELECT policy to satisfy `RETURNING`, and granting anon SELECT would have reopened the hole. `signup.html` calls this RPC now.
3. **`upgrade.html`** — new pricing page (Starter $19/mo–500 req, Pro $49/mo–1000 req placeholders), Paddle Checkout wired in but needs real Price IDs (`REPLACE_ME_PRICE_ID_STARTER`/`_PRO`) and client-side token (`REPLACE_ME_PADDLE_CLIENT_SIDE_TOKEN`).
4. **Monthly quota reset + rate-limit monitoring** — see workflow table above. Both tested live against real data.
5. **3 Supabase monitoring views** (`usage_daily_summary`, `customer_quota_status`, `google_ads_calls_hourly`) — query from Supabase Studio, not exposed over REST.
6. **Payment provider switched from Stripe to Paddle** — Stripe isn't available in the account owner's country; Paddle is a merchant-of-record so it can bill in USD without a local Stripe account. Razorpay was considered and rejected (INR-first, not a clean fit for USD billing).
7. **Dashboard Search API built** — public webhook (no login) that lets anyone search keywords without an API key, gated by the *same* quota system via an RPC-based auto-signup pattern (not yet wired into a frontend — see Not Yet Built #1).

## Bugs hit this session — avoid repeating

1. **Postgres views default to the *creator's* privileges for RLS, not the querying role's.** `security_invoker` defaults to `false` even on modern Postgres for backward compatibility. The 3 new monitoring views initially let the anon key read full customer data straight through RLS — caught by testing with the anon key immediately after creating them (same habit as testing tables). Fix: `ALTER VIEW ... SET (security_invoker = true)` on every view built over an RLS-protected table, plus explicit `REVOKE` as defense in depth. **Do this on any future view.**
2. **RLS + `RETURNING` needs a SELECT policy too**, not just INSERT. An INSERT-only policy works for a bare `POST`, but breaks the moment the client asks for the row back (`Prefer: return=representation`), which `signup.html` needs to show the generated API key. Solved with a `SECURITY DEFINER` function instead of a table policy.
3. **n8n's Execute Sub-workflow node has unreliable `predefinedCredentialType` credential resolution across workflow boundaries.** `Validate API Key` (using the `rsl` credential) silently returned 0 rows every time it was invoked via Execute Sub-workflow from a webhook-triggered parent workflow — but worked perfectly every time when the same node was triggered directly (manual trigger, schedule trigger, or its own webhook). Root cause not fully diagnosed. Workaround: **Dashboard Search API duplicates the gating logic inline** instead of calling `Get Keyword Ideas (Gated)` as a sub-workflow. Traded DRY for reliability — don't try to DRY this up with Execute Sub-workflow again without re-testing carefully first.
4. **Latent bug in the original gated workflows (predates this session):** `Validate API Key` never had `alwaysOutputData: true` set. On an invalid API key, the query returns 0 rows, and n8n's zero-item-safety **skips `Gate Check` entirely** rather than running it with an empty item — meaning `Gate Check`'s own "no rows → throw INVALID_API_KEY" logic never executed. Invalid keys were silently producing empty tool output instead of a clear error, in the paid tools too, since before this session. **Fixed in all 4 gated-pattern workflows** (`alwaysOutputData: true` added to `Validate API Key`).
5. **`continueErrorOutput` on a Code node reformats thrown error messages, dropping custom prefixes.** `throw new Error('INVALID_INPUT: seedKeywords is required')` came out the other side as just `"seedKeywords is required [line 4]"` — the `INVALID_INPUT:` prefix vanished, breaking string-based error-code parsing downstream. Fix: don't throw + parse; have the node `return` a structured `{ok, code, message}` object directly and branch with a plain IF node instead.
6. **Editing a workflow via the update tool only changes the draft** — the live/active webhook keeps running the previously-published version until you explicitly re-publish. Cost a full test cycle twice this session (fixed a bug, tested against the still-stale published version, concluded the fix didn't work). **Always re-publish after every settings/parameter change to a workflow you're about to test live.**
7. **Render free tier restarts under sustained call volume** — confirmed directly by the account owner mid-session after a burst of rapid test calls caused 503s and MCP proxy errors. Space out live executions; treat a cluster of connection errors as a probable restart, not a logic bug, before diving into debugging.

## Product positioning: API vs MCP

The account owner flagged a real inconsistency: materials talk about "MCP" but signup issues an "API key" — which is it?

**Answer: it's an API product.** `signup_customer` issues a plain bearer `api_key`, nothing MCP-specific. MCP is one *access channel* to that same API, not a separate product — the same key authenticates both an MCP tool call and a plain HTTP call. Messaging should be "sign up for API access," with MCP mentioned as a supported way to *use* it (call it from Claude/ChatGPT via MCP, or hit the REST endpoint directly), not as the thing being signed up for.

This surfaced a real gap and an open question, neither resolved yet:

- **Gap:** only `Get Keyword Ideas` has a public webhook counterpart (`Dashboard Search API`). `Get Historical Keyword Metrics` and `Get PageSpeed Insights` are *only* reachable via MCP right now — no REST/webhook path exists for them.
- **Open question, not yet investigated:** how does a paying customer actually *connect* via MCP? Is there one shared MCP server URL for every customer, with each customer's `apiKey` passed per tool-call as an argument? Or something else? This needs a clear answer before documenting an MCP onboarding flow for customers.

## Not yet built

1. **Dashboard frontend (`dashboard.html` or similar) — the actual search UI users would use.** This was the first thing asked for this session ("search keywords in dashboard") and the backend (`Dashboard Search API`) is built, tested, and working — but **no frontend page consuming it exists yet.** This is the most important next step.
2. **CSV/XLSX/PDF export** of search results — not started. Once the dashboard frontend exists, CSV is trivial (client-side, no library), XLSX needs a CDN library (e.g. SheetJS), PDF needs one too (e.g. jsPDF) or a print-to-PDF fallback.
3. **Free-search auto-provisioning** — the plan discussed (and what `Dashboard Search API`'s gating already supports) is: anonymous dashboard visitors silently get a real free-tier account via `signup_customer` on first visit (synthetic email, e.g. `anon-<uuid>@dashboard-visitor.local`), with the key cached in `localStorage` — reusing the *existing* 50/month quota system rather than a separate counter. Not implemented in any frontend yet since the frontend itself doesn't exist.
4. **Paddle wiring** — credential, Price IDs, client-side token, webhook registration in Paddle's dashboard, and a full sandbox checkout→webhook→DB-update test. See the Stripe section of the original handoff for the shape of what's needed; same idea, Paddle instead.
5. GSC/GA4/URL Inspection tools remain deliberately ungated (OAuth verification lead time).
6. Pricing ($19/$49 placeholders) not validated against real cache-hit-rate economics.

## Test customer

- Email: `manoj.digitalmarketing08@gmail.com`
- API key: `c217fb8d2835986398b66c8f82026727d21e5a77f82f72f8`
- Plan: `pro`, quota: 1000 (quota_used was reset to 0 during this session's testing of `Reset Monthly Quotas`)
