import "server-only";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/** Staff-only Server Action entry: verifies the role, returns a session client. */
export async function staffClient(returnPath: string) {
  const user = await requireRole(STAFF_ROLES, returnPath);
  return { user, supabase: await createClient() };
}
