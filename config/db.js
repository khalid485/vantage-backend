const { createClient } = require('@supabase/supabase-js');

let _client;
function getSupabase() {
  if (!_client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
    }
    _client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false }, db: { schema: 'public' } }
    );
  }
  return _client;
}

// Proxy so callers can use `supabase.from(...)` directly
module.exports = new Proxy({}, {
  get(_, prop) { return getSupabase()[prop]; }
});
