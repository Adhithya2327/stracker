import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key. Never import
 * this file from a Client Component — it will fail loudly (thanks to
 * the `server-only` package) if you try.
 *
 * This app is a read-only public dashboard over non-sensitive data
 * (news articles, stock metadata), so using the service role key here
 * is a deliberate simplification for a portfolio project rather than a
 * production pattern — see README for the security note.
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
