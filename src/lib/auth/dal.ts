import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/database.types";

export type CurrentUser = {
  id: string;
  email: string | null;
  roles: AppRole[];
};

/**
 * Data Access Layer: the only place that reads the session.
 * Reads cookies, so callers must sit behind a <Suspense> boundary.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  // RLS allows a user to read only their own role rows.
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", claims.sub);

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    roles: (roleRows ?? []).map((row) => row.role),
  };
});

export async function requireUser(nextPath = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Hides restricted areas behind a 404 rather than revealing they exist. */
export async function requireRole(
  allowed: readonly AppRole[],
  nextPath: string,
) {
  const user = await requireUser(nextPath);
  if (!user.roles.some((role) => allowed.includes(role))) notFound();
  return user;
}

export const STAFF_ROLES = ["staff", "admin"] as const satisfies AppRole[];
