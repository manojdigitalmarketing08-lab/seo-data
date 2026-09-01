const { supabase } = require('../supabase');
const { SLACK_WEBHOOK_URL } = require('../config');

const THRESHOLD = 50;

async function notifySlack(message) {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });
  } catch (err) {
    console.error('SLACK_NOTIFY_ERROR', err.message);
  }
}

// Equivalent to the "Rate Limit Monitor" workflow (hourly, log-only in n8n —
// here it also posts to Slack if SLACK_WEBHOOK_URL is set, since there's no
// n8n execution history to eyeball anymore).
async function checkRateLimit() {
  const oneHourAgoISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('cache_hit', false)
    .in('tool_name', ['Get_Keyword_Ideas', 'Get_Historical_Keyword_Metrics'])
    .gte('called_at', oneHourAgoISO);

  if (error) throw new Error('RATE_LIMIT_CHECK_ERROR: ' + error.message);

  const overThreshold = count >= THRESHOLD;
  if (overThreshold) {
    const message = `RATE_LIMIT_WARNING: ${count} live Google Ads calls in the last hour (threshold: ${THRESHOLD}).`;
    console.warn(message);
    await notifySlack(message);
  }

  return { count, threshold: THRESHOLD, overThreshold };
}

module.exports = { checkRateLimit };
