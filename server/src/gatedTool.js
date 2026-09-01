const { GateError, validateCustomer, getCache, saveCache, incrementQuota, logUsage } = require('./gate');

// Shared shape of every gated workflow: validate -> cache check -> live call -> cache write -> quota -> log.
async function runGatedTool({ apiKey, cacheKey, cacheLabel, cacheLocation, toolName, callApi }) {
  const customer = await validateCustomer(apiKey);

  const cached = await getCache(cacheKey);
  if (cached) {
    await logUsage(customer.id, toolName, true);
    return { source: 'cache', cachedAt: cached.cached_at, result: cached.result_json };
  }

  const result = await callApi();
  await saveCache(cacheKey, cacheLabel, cacheLocation, result);
  await incrementQuota(customer.id, customer.quota_used_this_period);
  await logUsage(customer.id, toolName, false);
  return { source: 'live', result };
}

module.exports = { runGatedTool, GateError };
