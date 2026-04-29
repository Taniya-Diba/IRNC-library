import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses ALL RLS
// Use for: admin operations, server-side data writes, reading any data
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Anon client — respects RLS, used for Auth operations
// Use for: verifying user tokens, sign-in, sign-up
const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export { supabaseAdmin, supabaseClient };
