const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase');

// Bridges a Supabase Auth session (email/password login, see login.html) to the
// existing apiKey-based account model: verify the access token with Supabase
// Auth, look up the customer row by the verified email (customers.email is
// unique), and hand back their api_key so the rest of the app — dashboard.js,
// dashboard-search-keywords, the gated tool routes — keeps working exactly as
// it did when the key was pasted in by hand.
router.post('/', async (req, res) => {
  const { accessToken } = req.body || {};

  if (!accessToken) {
    return res.status(400).json({ ok: false, code: 'INVALID_INPUT', message: 'accessToken is required' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData || !userData.user || !userData.user.email) {
    return res.status(401).json({ ok: false, code: 'INVALID_SESSION', message: 'Session is invalid or has expired' });
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, api_key, plan, monthly_quota, quota_used_this_period, period_reset_at, status, created_at')
    .eq('email', userData.user.email)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(502).json({ ok: false, code: 'UPSTREAM_ERROR', message: error.message });
  }
  if (!customer) {
    return res.status(404).json({
      ok: false,
      code: 'NO_CUSTOMER_RECORD',
      message: 'Your account is verified, but no customer record exists for this email yet.'
    });
  }

  const { id, api_key, ...customerFields } = customer;
  res.json({ ok: true, apiKey: api_key, customer: customerFields });
});

module.exports = router;
