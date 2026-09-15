-- Cross-brief cache for content-brief per-keyword brand-check + SERP signals.
-- Avoids re-paying Knowledge Graph / Serper.dev calls when the same keyword
-- (e.g. a competitor's product name like "zoho projects") shows up as a
-- candidate across different topics' content briefs — the whole-brief cache
-- in keyword_cache only helps on an exact repeat of the same topic/location/
-- intent, not on keyword overlap between different topics.

create table public.keyword_signal_cache (
  id uuid primary key default gen_random_uuid(),
  keyword_text text unique not null,
  kg_flagged boolean,
  kg_ok boolean,
  serp_result jsonb,
  cached_at timestamptz not null default now()
);

alter table public.keyword_signal_cache enable row level security;
-- No anon policies — accessed only via the server's service_role key
-- (server/src/contentBrief/signalCache.js), same lockdown model as
-- keyword_cache and usage_log.
