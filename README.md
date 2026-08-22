# SEO Keyword API — SaaS Build

A subscription-gated wrapper around Google Ads Keyword Planner + PageSpeed Insights, exposed as MCP tools and a browser dashboard. Built on n8n + Supabase.

## Repo contents

This repo is a version-controlled snapshot of the infrastructure — the live system runs on n8n (`https://n8n-oyaw.onrender.com`) and Supabase (`pcmsotnmkxeriapajyco`), not from this repo directly.

- `signup.html` — static signup page, calls the `signup_customer` Supabase RPC directly (anon key, safe to embed client-side)
- `upgrade.html` — Paddle Checkout pricing page for Starter/Pro plans
- `workflows/` — n8n workflow exports (importable JSON)
  - `get-keyword-ideas-gated.json`, `get-historical-keyword-metrics-gated.json`, `get-pagespeed-insights-gated.json` — the three gated MCP tools (API-key auth, quota + cache enforcement)
  - `dashboard-search-api.json` — public webhook wrapper exposing keyword search to the browser dashboard, gated by the same quota system
  - `reset-monthly-quotas.json` — daily idempotent job resetting `quota_used_this_period`
  - `rate-limit-monitor.json` — hourly check of live Google Ads call volume against a threshold
  - `paddle-webhook-handler.json` — Paddle Billing (sandbox) webhook handler; **inactive**, needs a Paddle API credential wired in before use
- `supabase/schema.sql` — base table definitions
- `supabase/migrations/` — applied migrations in order (RLS, signup RPC, Paddle column rename, monitoring views)

## Architecture notes

- **Auth model:** customers get an `api_key` (bearer token) from signup, no password/session system. RLS is enabled on all tables with zero broad anon policies — the only public write path is the `signup_customer` RPC, which is `SECURITY DEFINER` and returns only the fields a new signup needs.
- **Backend writes** (quota increments, cache writes, subscription updates) all go through the `rsl` Supabase service_role credential in n8n, which bypasses RLS by design.
- **Caching:** `keyword_cache` is keyed by normalized seed keywords + location, shared across all customers, to reduce load on the shared Google Ads account (single developer-token quota shared by every customer).
- **Payment provider:** Paddle (merchant-of-record), not Stripe — Stripe isn't available in the account owner's country, and Paddle supports USD billing without requiring a local Stripe account.
- **Free dashboard demo:** the `Dashboard Search API` workflow mirrors the gated `Get Keyword Ideas` workflow node-for-node rather than calling it via Execute Sub-workflow — cross-workflow credential resolution proved unreliable in testing (see the sticky note inside that workflow's JSON).

## Known gaps

- The Paddle webhook handler needs a `Paddle` Header Auth credential (sandbox API key) wired into n8n before it can be activated, plus real Price IDs for Starter/Pro in `upgrade.html` (currently placeholders marked `REPLACE_ME_*`).
- The n8n instance runs on Render's free tier and restarts under sustained call volume — space out testing.
- Pricing ($19/$49) is a placeholder, not validated against real cache-hit-rate economics.
