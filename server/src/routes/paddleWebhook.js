const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { supabase } = require('../supabase');
const { PADDLE_API_KEY, PADDLE_API_BASE, PADDLE_WEBHOOK_SECRET } = require('../config');

const PLAN_QUOTAS = { starter: 500, pro: 1000 };
const SUB_STATUS_MAP = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  paused: 'past_due',
  canceled: 'cancelled'
};

async function paddleFetch(path) {
  const res = await fetch(`${PADDLE_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${PADDLE_API_KEY}` }
  });
  const json = await res.json();
  if (!res.ok) throw new Error('PADDLE_API_ERROR: ' + JSON.stringify(json));
  return json;
}

// Paddle Billing signs webhooks as "ts=<unix>;h1=<hmac-sha256 hex of `${ts}:${rawBody}`>".
// The n8n version never verified this. Requires raw body, so this route is mounted
// before express.json() in index.js.
function verifyPaddleSignature(req) {
  if (!PADDLE_WEBHOOK_SECRET) return true; // not configured yet — skip until secret is set
  const header = req.get('Paddle-Signature') || '';
  const parts = Object.fromEntries(header.split(';').map((p) => p.split('=')));
  if (!parts.ts || !parts.h1) return false;

  const expected = crypto
    .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
    .update(`${parts.ts}:${req.rawBody}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.h1));
}

router.post('/', express.raw({ type: '*/*' }), async (req, res) => {
  req.rawBody = req.body.toString('utf8');

  if (!verifyPaddleSignature(req)) {
    return res.status(401).json({ ok: false, code: 'INVALID_SIGNATURE' });
  }

  let event;
  try {
    event = JSON.parse(req.rawBody);
  } catch {
    return res.status(400).json({ ok: false, code: 'INVALID_JSON' });
  }

  // Ack immediately (n8n used responseMode: onReceived) and process after.
  res.status(200).json({ received: true });

  try {
    switch (event.event_type) {
      case 'transaction.completed': {
        const txnId = event.data.id;
        const { data: txn } = await paddleFetch(`/transactions/${txnId}`);
        if (!txn || txn.status !== 'completed') break;

        const email = txn.custom_data && txn.custom_data.email;
        const plan = txn.custom_data && txn.custom_data.plan;
        const monthlyQuota = PLAN_QUOTAS[plan];
        if (!email || !plan || !monthlyQuota) {
          console.error(
            `PADDLE_WEBHOOK_ERROR: transaction ${txn.id} missing custom_data.email/plan. email=${email} plan=${plan}`
          );
          break;
        }

        const { data, error } = await supabase
          .from('customers')
          .update({
            plan,
            monthly_quota: monthlyQuota,
            paddle_customer_id: txn.customer_id,
            paddle_subscription_id: txn.subscription_id,
            status: 'active'
          })
          .eq('email', email)
          .select('id, email');

        if (error || !data || data.length === 0) {
          console.error(
            `PADDLE_WEBHOOK_ERROR: transaction.completed matched no customer row for email ${email}`
          );
        }
        break;
      }

      case 'subscription.updated': {
        const subId = event.data.id;
        const { data: sub } = await paddleFetch(`/subscriptions/${subId}`);
        const status = SUB_STATUS_MAP[sub.status] || 'past_due';

        const { data, error } = await supabase
          .from('customers')
          .update({ status })
          .eq('paddle_subscription_id', sub.id)
          .select('id, email');

        if (error || !data || data.length === 0) {
          console.error(`PADDLE_WEBHOOK_ERROR: subscription.updated matched no customer row for ${subId}`);
        }
        break;
      }

      case 'subscription.canceled': {
        const subId = event.data.id;
        const { data: sub } = await paddleFetch(`/subscriptions/${subId}`);
        if (!sub || sub.status !== 'canceled') break;

        const { data, error } = await supabase
          .from('customers')
          .update({ status: 'cancelled' })
          .eq('paddle_subscription_id', sub.id)
          .select('id, email');

        if (error || !data || data.length === 0) {
          console.error(`PADDLE_WEBHOOK_ERROR: subscription.canceled matched no customer row for ${subId}`);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('PADDLE_WEBHOOK_ERROR', err);
  }
});

module.exports = router;
