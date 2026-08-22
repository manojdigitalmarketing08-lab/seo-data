-- Views default to running with their CREATOR's privileges for RLS
-- purposes (security_invoker defaults to false even on modern Postgres,
-- kept for backward compatibility) -- so these views silently bypassed
-- RLS entirely when queried by anon, leaking the same data RLS was just
-- added to protect. security_invoker=true makes RLS evaluate against the
-- QUERYING role instead, matching how the base tables already behave.
ALTER VIEW public.usage_daily_summary SET (security_invoker = true);
ALTER VIEW public.customer_quota_status SET (security_invoker = true);
ALTER VIEW public.google_ads_calls_hourly SET (security_invoker = true);

-- Defense in depth: explicitly close the relation-level grant too, so
-- this isn't relying on RLS alone.
REVOKE ALL ON public.usage_daily_summary FROM anon, authenticated;
REVOKE ALL ON public.customer_quota_status FROM anon, authenticated;
REVOKE ALL ON public.google_ads_calls_hourly FROM anon, authenticated;
