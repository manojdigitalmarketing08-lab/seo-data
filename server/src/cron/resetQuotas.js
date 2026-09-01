const { supabase } = require('../supabase');

// Equivalent to the "Reset Monthly Quotas" workflow (daily 00:10 UTC, idempotent).
async function resetOverdueQuotas() {
  const now = new Date();
  const nowISO = now.toISOString();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));

  const { data, error } = await supabase
    .from('customers')
    .update({ quota_used_this_period: 0, period_reset_at: next.toISOString() })
    .lte('period_reset_at', nowISO)
    .select('id, email');

  if (error) throw new Error('RESET_QUOTAS_ERROR: ' + error.message);

  console.log(`[reset-quotas] reset ${data.length} customer(s) at ${nowISO}`);
  return data.length;
}

module.exports = { resetOverdueQuotas };
