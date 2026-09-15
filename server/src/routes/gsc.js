const express = require('express');
const router = express.Router();
const { GateError, validateCustomer } = require('../gate');
const { GSC_POST_AUTH_REDIRECT_URL } = require('../config');
const oauth = require('../gsc/oauth');
const { listSites } = require('../gsc/searchConsoleApi');
const { getGscSearchAnalytics } = require('../gsc/searchAnalyticsService');

function sendGateError(res, err) {
  if (err instanceof GateError) {
    return res.status(err.httpStatus).json({ ok: false, code: err.code, message: err.message });
  }
  console.error(err);
  res.status(502).json({ ok: false, code: 'UPSTREAM_ERROR', message: err.message });
}

// Plain top-level browser navigation (not fetch/XHR) — no CORS needed.
// GET so the dashboard can use it as a plain link/redirect.
router.get('/connect', async (req, res) => {
  const apiKey = req.query.apiKey;
  try {
    const customer = await validateCustomer(apiKey);
    res.redirect(oauth.getAuthUrl(customer.id));
  } catch (err) {
    if (err instanceof GateError) {
      return res.status(err.httpStatus).json({ ok: false, code: err.code, message: err.message });
    }
    console.error(err);
    res.status(502).json({ ok: false, code: 'UPSTREAM_ERROR', message: err.message });
  }
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const customerId = state && oauth.verifyState(state);

  if (!code || !customerId) {
    return res.redirect(`${GSC_POST_AUTH_REDIRECT_URL}?gsc=error`);
  }

  try {
    const tokens = await oauth.exchangeCodeForTokens(code);
    await oauth.saveConnection(customerId, {
      googleEmail: tokens.email,
      refreshToken: tokens.refreshToken,
      scope: tokens.scope
    });
    res.redirect(`${GSC_POST_AUTH_REDIRECT_URL}?gsc=connected`);
  } catch (err) {
    console.error('GSC_CALLBACK_ERROR', err);
    res.redirect(`${GSC_POST_AUTH_REDIRECT_URL}?gsc=error`);
  }
});

// Unmetered — account-management reads, not billable tool calls.
router.post('/status', async (req, res) => {
  const { apiKey } = req.body || {};
  try {
    const customer = await validateCustomer(apiKey);
    const connection = await oauth.getConnection(customer.id);
    if (!connection) return res.json({ ok: true, connected: false });
    res.json({ ok: true, connected: true, googleEmail: connection.google_email, connectedAt: connection.connected_at });
  } catch (err) {
    sendGateError(res, err);
  }
});

router.post('/sites', async (req, res) => {
  const { apiKey } = req.body || {};
  try {
    const customer = await validateCustomer(apiKey);
    const accessToken = await oauth.getAccessTokenForCustomer(customer.id);
    const sites = await listSites(accessToken);
    res.json({ ok: true, sites });
  } catch (err) {
    if (err.code === 'GSC_NOT_CONNECTED') {
      return res.status(409).json({ ok: false, code: 'GSC_NOT_CONNECTED', message: err.message });
    }
    sendGateError(res, err);
  }
});

router.post('/search-analytics', async (req, res) => {
  const { apiKey, siteUrl, startDate, endDate, dimensions, rowLimit } = req.body || {};
  try {
    const out = await getGscSearchAnalytics({ apiKey, siteUrl, startDate, endDate, dimensions, rowLimit });
    res.json({ ok: true, ...out });
  } catch (err) {
    sendGateError(res, err);
  }
});

router.post('/disconnect', async (req, res) => {
  const { apiKey } = req.body || {};
  try {
    const customer = await validateCustomer(apiKey);
    await oauth.deleteConnection(customer.id);
    res.json({ ok: true });
  } catch (err) {
    sendGateError(res, err);
  }
});

module.exports = router;
