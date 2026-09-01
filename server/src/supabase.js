const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require('./config');

// service_role key bypasses RLS by design, same as the `rsl` credential in n8n.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

module.exports = { supabase };
