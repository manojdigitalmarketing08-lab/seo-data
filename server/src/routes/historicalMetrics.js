const express = require('express');
const router = express.Router();
const { runGatedTool, GateError } = require('../gatedTool');
const { generateHistoricalMetrics } = require('../googleAds');

// Equivalent to the "Get Historical Keyword Metrics (Gated)" workflow.
router.post('/', async (req, res) => {
  const { apiKey, keywords, location } = req.body || {};

  if (!keywords) {
    return res.status(400).json({ ok: false, code: 'INVALID_INPUT', message: 'keywords is required' });
  }

  const loc = (location || 'india').toLowerCase().trim();
  const kws = keywords.split(',').map((k) => k.trim().toLowerCase()).sort().join(',');
  const cacheKey = `historical::${loc}::${kws}`;

  try {
    const out = await runGatedTool({
      apiKey,
      cacheKey,
      cacheLabel: keywords,
      cacheLocation: location || 'India',
      toolName: 'Get_Historical_Keyword_Metrics',
      callApi: () => generateHistoricalMetrics(keywords, location)
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
