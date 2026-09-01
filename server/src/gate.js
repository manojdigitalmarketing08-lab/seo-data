const { supabase } = require('./supabase');

class GateError extends Error {
  constructor(code, message, httpStatus) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus || 400;
  }
}

// Mirrors the "Validate API Key" + "Gate Check" nodes in every gated n8n workflow.
async function validateCustomer(apiKey) {
  if (!apiKey) throw new GateError('INVALID_INPUT', 'apiKey is required', 400);

  const { data, error } = await supabase
    .from('customers')
    .select('id, plan, monthly_quota, quota_used_this_period, status')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (error) throw new Error('SUPABASE_ERROR: ' + error.message);
  if (!data) throw new GateError('INVALID_API_KEY', 'no customer found for this key', 401);
  if (data.status !== 'active') {
    throw new GateError('ACCOUNT_INACTIVE', 'subscription status is ' + data.status, 403);
  }
  if (data.quota_used_this_period >= data.monthly_quota) {
    throw new GateError(
      'QUOTA_EXCEEDED',
      `used ${data.quota_used_this_period} of ${data.monthly_quota} this period`,
      429
    );
  }
  return data;
}

// Mirrors "Check Cache" + "Normalize Cache Result".
async function getCache(cacheKey) {
  const { data, error } = await supabase
    .from('keyword_cache')
    .select('result_json, cached_at')
    .eq('cache_key', cacheKey)
    .maybeSingle();
  if (error) {
    console.error('CACHE_LOOKUP_ERROR', error.message);
    return null;
  }
  return data || null;
}

// Mirrors "Save To Cache" (upsert on cache_key, same as on_conflict=cache_key in n8n).
async function saveCache(cacheKey, seedKeywords, location, resultJson) {
  const { error } = await supabase.from('keyword_cache').upsert(
    { cache_key: cacheKey, seed_keywords: seedKeywords, location, result_json: resultJson },
    { onConflict: 'cache_key' }
  );
  if (error) console.error('CACHE_SAVE_ERROR', error.message);
}

// Mirrors "Increment Quota".
async function incrementQuota(customerId, currentUsed) {
  const { error } = await supabase
    .from('customers')
    .update({ quota_used_this_period: currentUsed + 1 })
    .eq('id', customerId);
  if (error) console.error('QUOTA_INCREMENT_ERROR', error.message);
}

// Mirrors "Log Cache Hit" / "Log Cache Miss".
async function logUsage(customerId, toolName, cacheHit) {
  const { error } = await supabase
    .from('usage_log')
    .insert({ customer_id: customerId, tool_name: toolName, cache_hit: cacheHit });
  if (error) console.error('USAGE_LOG_ERROR', error.message);
}

module.exports = { GateError, validateCustomer, getCache, saveCache, incrementQuota, logUsage };
