-- Daily call volume per tool + cache-hit rate, for spotting usage trends.
CREATE OR REPLACE VIEW public.usage_daily_summary AS
SELECT
  date_trunc('day', called_at) AS day,
  tool_name,
  count(*) AS total_calls,
  count(*) FILTER (WHERE cache_hit) AS cache_hits,
  round(100.0 * count(*) FILTER (WHERE cache_hit) / NULLIF(count(*), 0), 1) AS cache_hit_rate_pct
FROM public.usage_log
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- Per-customer quota utilization at a glance.
CREATE OR REPLACE VIEW public.customer_quota_status AS
SELECT
  id,
  email,
  plan,
  status,
  monthly_quota,
  quota_used_this_period,
  round(100.0 * quota_used_this_period / NULLIF(monthly_quota, 0), 1) AS quota_used_pct,
  period_reset_at,
  created_at
FROM public.customers
ORDER BY quota_used_this_period DESC;

-- Hourly volume of LIVE (non-cached) calls that actually hit the shared
-- Google Ads account, since that account's rate limit is the real
-- multi-customer scaling risk -- PageSpeed Insights uses a separate key
-- and isn't subject to it.
CREATE OR REPLACE VIEW public.google_ads_calls_hourly AS
SELECT
  date_trunc('hour', called_at) AS hour,
  count(*) AS live_calls
FROM public.usage_log
WHERE cache_hit = false
  AND tool_name IN ('Get_Keyword_Ideas', 'Get_Historical_Keyword_Metrics')
GROUP BY 1
ORDER BY 1 DESC;

-- None of these are granted to anon/authenticated, so (like the base
-- tables) they're invisible over the public REST API -- query them from
-- Supabase Studio's Table Editor or SQL Editor, which runs with the
-- project owner's elevated access regardless of RLS.
