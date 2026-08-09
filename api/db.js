const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_SECRET_KEY environment variables.');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function getSupabaseAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase auth credentials not configured. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY environment variables.');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

module.exports = { getSupabaseClient, getSupabaseAuthClient };
