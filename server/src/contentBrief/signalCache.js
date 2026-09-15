const { supabase } = require('../supabase');

// Cross-brief cache for per-keyword brand-check + SERP signals — see
// supabase/migrations/007_keyword_signal_cache.sql. Distinct from the
// whole-brief cache in keyword_cache: that one only helps on an exact repeat
// of the same topic/location/intent, this one helps when the SAME keyword
// (e.g. a competitor's product name) shows up as a candidate under a
// DIFFERENT topic's brief.
async function getCachedSignal(keywordText) {
  const { data, error } = await supabase
    .from('keyword_signal_cache')
    .select('kg_flagged, kg_ok, serp_result')
    .eq('keyword_text', keywordText)
    .maybeSingle();

  if (error) {
    console.error('SIGNAL_CACHE_READ_ERROR', error.message);
    return null;
  }
  return data || null;
}

// Only persist when at least one signal actually produced usable data — a
// total failure (both API calls broken) shouldn't get cached forever, since
// that would keep serving "unknown" for a keyword even after the underlying
// config issue is fixed.
async function saveCachedSignal(keywordText, { kgFlagged, kgOk, serpResult }) {
  if (!kgOk && !(serpResult && serpResult.configured)) return;

  const { error } = await supabase.from('keyword_signal_cache').upsert(
    { keyword_text: keywordText, kg_flagged: kgFlagged, kg_ok: kgOk, serp_result: serpResult },
    { onConflict: 'keyword_text' }
  );
  if (error) console.error('SIGNAL_CACHE_WRITE_ERROR', error.message);
}

module.exports = { getCachedSignal, saveCachedSignal };
