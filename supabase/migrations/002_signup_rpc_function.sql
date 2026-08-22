-- The direct-table INSERT policy can't support signup.html's need to read
-- back the DB-generated api_key: Postgres requires a SELECT policy to
-- satisfy RETURNING/return=representation, and granting anon SELECT would
-- reopen the exact hole RLS was added to close. Route signups through a
-- SECURITY DEFINER function instead: it inserts with elevated privileges
-- (bypassing RLS internally) and returns only the fields the client needs.
DROP POLICY IF EXISTS "anon can self-signup on free tier only" ON public.customers;

CREATE OR REPLACE FUNCTION public.signup_customer(customer_email text)
RETURNS TABLE (api_key text, plan text, monthly_quota integer, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_row public.customers;
BEGIN
  IF customer_email IS NULL OR customer_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email address' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.customers (email)
  VALUES (lower(trim(customer_email)))
  RETURNING * INTO new_row;

  RETURN QUERY SELECT new_row.api_key, new_row.plan, new_row.monthly_quota, new_row.status;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'an account with this email already exists' USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION public.signup_customer(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_customer(text) TO anon;
