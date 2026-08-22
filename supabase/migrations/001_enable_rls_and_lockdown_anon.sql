-- Enable RLS on all customer-data tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;

-- customers: allow public self-signup (INSERT only), but pin every
-- privilege-bearing column to its safe default so a crafted request
-- can't self-upgrade to a paid plan or a pre-inflated quota.
-- No SELECT/UPDATE/DELETE policy exists for anon, so those are fully denied.
CREATE POLICY "anon can self-signup on free tier only"
  ON public.customers
  FOR INSERT
  TO anon
  WITH CHECK (
    plan = 'free'
    AND monthly_quota = 50
    AND quota_used_this_period = 0
    AND status = 'active'
    AND stripe_customer_id IS NULL
    AND stripe_subscription_id IS NULL
  );

-- keyword_cache and usage_log: no anon/authenticated policies at all.
-- All access to these tables now requires the service_role key
-- (which bypasses RLS by design), used only by the trusted n8n backend.
