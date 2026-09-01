const express = require('express');
const router = express.Router();
const { runGatedTool, GateError } = require('../gatedTool');
const { runPagespeed } = require('../pagespeed');

// Equivalent to the "Get PageSpeed Insights (Gated)" workflow.
router.post('/', async (req, res) => {
  const { apiKey, url, strategy } = req.body || {};

  if (!url) {
    return res.status(400).json({ ok: false, code: 'INVALID_INPUT', message: 'url is required' });
  }

  const strat = (strategy || 'mobile').toLowerCase().trim();
  const cacheKey = `pagespeed::${strat}::${url.trim().toLowerCase()}`;

  try {
    const out = await runGatedTool({
      apiKey,
      cacheKey,
      cacheLabel: url,
      cacheLocation: strat,
      toolName: 'Get_PageSpeed_Insights',
      callApi: () => runPagespeed(url, strategy)
    });
    res.json({ ok: true, ...out });
  } catch (err) {
    if (err instanceof GateError) {
      return res.status(err.httpStatus).json({ ok: false, code: err.code, message: err.message });
    }
    console.error(err);
    res.status(502).json({ ok: false, code: 'UPSTREAM_ERROR', message: err.message });
  }
});

module.exports = router;
