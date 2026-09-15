const { GateError, validateCustomer, incrementQuota, logUsage } = require('../gate');
const { getAccessTokenForCustomer } = require('./oauth');
const { querySearchAnalytics } = require('./searchConsoleApi');

// Deliberately does NOT go through runGatedTool/keyword_cache: GSC data changes
// daily with a 2-3 day lag and is per-customer (not shareable across customers
// the way keyword data is), so caching it would mean serving stale rankings.
// Always live; only reuses gate.js's individual validate/quota/log primitives.
async function getGscSearchAnalytics({ apiKey, siteUrl, startDate, endDate, dimensions, rowLimit }) {
  if (!siteUrl || !startDate || !endDate) {
    throw new GateError('INVALID_INPUT', 'siteUrl, startDate, and endDate are required', 400);
  }

  const customer = await validateCustomer(apiKey);

  let accessToken;
  try {
    accessToken = await getAccessTokenForCustomer(customer.id);
  } catch (err) {
    if (err.code === 'GSC_NOT_CONNECTED') {
      throw new GateError(
        'GSC_NOT_CONNECTED',
        'No Search Console account connected for this customer. Connect one via GET /api/gsc/connect first.',
        409
      );
    }
    throw err;
  }

  const rows = await querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions, rowLimit });

  await incrementQuota(customer.id, customer.quota_used_this_period);
  await logUsage(customer.id, 'Get_GSC_Search_Analytics', false);

  return { siteUrl, startDate, endDate, dimensions: dimensions && dimensions.length ? dimensions : ['query'], rows };
}

module.exports = { getGscSearchAnalytics };
