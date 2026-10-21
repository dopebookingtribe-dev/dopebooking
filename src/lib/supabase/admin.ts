import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import type { Database } from "./database.types";

/**
 * Bypasses RLS. Only for trusted server jobs (the email worker), and for
 * read-only lookups RLS can't express (sign-in emails on the admin users
 * page) after the caller passed a server-side permission check. Never use
 * it to write on a user's behalf.
 */
export function createAdminClient() {
  const key = getServerEnv().SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set.");
  return createClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
