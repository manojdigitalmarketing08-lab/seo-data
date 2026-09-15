-- Per-customer Google Search Console OAuth connections. Unlike the Google
-- Ads integration (one static refresh token for our own account), GSC data
-- belongs to each customer's own verified property, so each customer
-- connects their own Google account. One connection per customer for now
-- (unique on customer_id) — reconnecting overwrites the existing row.

create table public.gsc_connections (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade unique,
  google_email text not null,
  refresh_token_encrypted text not null,
  scope text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gsc_connections enable row level security;
-- No anon/authenticated policies — accessed only via the server's
-- service_role key (server/src/gsc/oauth.js), same lockdown model as
-- keyword_cache, usage_log, and keyword_signal_cache.
