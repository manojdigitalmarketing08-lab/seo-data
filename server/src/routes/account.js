const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase');

// Powers the dashboard's account overview (plan, quota, reset date, recent usage) —
// the only read of `customers` a browser can trigger, scoped to exactly the fields
// the dashboard needs and keyed by the apiKey itself (same bearer-token trust model
// every gated tool route uses, see gate.js).
router.post('/', async (req, res) => {
  const { apiKey } = req.body || {};

  if (!apiKey) {
    return res.status(400).json({ ok: false, code: 'INVALID_INPUT', message: 'apiKey is required' });
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, plan, monthly_quota, quota_used_this_period, period_reset_at, status, created_at')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(502).json({ ok: false, code: 'UPSTREAM_ERROR', message: error.message });
  }
  if (!customer) {
    return res.status(401).json({ ok: false, code: 'INVALID_API_KEY', message: 'no customer found for this key' });
  }

  const { data: usage, error: usageError } = await supabase
    .from('usage_log')
    .select('tool_name, cache_hit, called_at')
    .eq('customer_id', customer.id)
    .order('called_at', { ascending: false })
    .limit(20);

  if (usageError) console.error('USAGE_FETCH_ERROR', usageError.message);

  const { id, ...customerFields } = customer;
  res.json({ ok: true, customer: customerFields, recentUsage: usage || [] });
});

module.exports = router;
