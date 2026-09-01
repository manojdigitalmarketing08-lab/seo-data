const express = require('express');
const router = express.Router();
const { runGatedTool, GateError } = require('../gatedTool');
const { generateKeywordIdeas } = require('../googleAds');

// Equivalent to the "Get Keyword Ideas (Gated)" workflow.
router.post('/', async (req, res) => {
  const { apiKey, seedKeywords, location } = req.body || {};

  if (!seedKeywords) {
    return res.status(400).json({ ok: false, code: 'INVALID_INPUT', message: 'seedKeywords is required' });
  }

  const loc = (location || 'india').toLowerCase().trim();
  const seeds = seedKeywords.split(',').map((k) => k.trim().toLowerCase()).sort().join(',');
  const cacheKey = `${loc}::${seeds}`;

  try {
    const out = await runGatedTool({
      apiKey,
      cacheKey,
      cacheLabel: seedKeywords,
      cacheLocation: location || 'India',
      toolName: 'Get_Keyword_Ideas',
      callApi: () => generateKeywordIdeas(seedKeywords, location)
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
