const express = require('express');
const router = express.Router();
const { runGatedTool, GateError } = require('../gatedTool');
const { buildContentBrief } = require('../contentBrief/buildBrief');

// The "answer, not data" tool: turns a topic into a scored/clustered keyword
// set, a page outline, and live SERP context — not just raw keyword-idea JSON.
router.post('/', async (req, res) => {
  const { apiKey, topic, location, intent } = req.body || {};

  if (!topic) {
    return res.status(400).json({ ok: false, code: 'INVALID_INPUT', message: 'topic is required' });
  }
  if (intent && !['informational', 'commercial', 'transactional'].includes(intent)) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_INPUT',
      message: 'intent must be one of: informational, commercial, transactional'
    });
  }

  const loc = (location || 'india').toLowerCase().trim();
  const cacheKey = `brief::${loc}::${topic.trim().toLowerCase()}::${(intent || '').toLowerCase()}`;

  try {
    const out = await runGatedTool({
      apiKey,
      cacheKey,
      cacheLabel: topic,
      cacheLocation: location || 'India',
      toolName: 'Get_Content_Brief',
      callApi: () => buildContentBrief({ topic, location, intent })
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
