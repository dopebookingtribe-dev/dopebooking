import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { AppPermission, AppRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, requireUser, type CurrentUser } from "./dal";

/**
 * Mirrors the role_permissions seed in the CMS migration. Used only when the
 * table can't be read, so a missing migration never locks the owner out.
 */
const FALLBACK: Partial<Record<AppRole, AppPermission[]>> = {
  admin: [
    "content.manage",
    "pages.edit",
    "pages.publish",
    "settings.manage",
    "demo.manage",
    "users.manage",
    "audit.view",
  ],
  staff: ["content.manage", "pages.edit"],
};

/** Permissions granted to the user's roles. The database enforces the same. */
export const getPermissions = cache(
  async (user: CurrentUser | null): Promise<Set<AppPermission>> => {
    if (!user || !user.roles.length) return new Set();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("role_permissions")
      .select("permission")
      .in("role", user.roles);
    if (error) {
      return new Set(user.roles.flatMap((role) => FALLBACK[role] ?? []));
    }
    return new Set(data.map((row) => row.permission));
  },
);

export async function currentPermissions() {
  return getPermissions(await getCurrentUser());
}

/** Server-side gate for admin pages and actions; 404s when not allowed. */
export async function requirePermission(
  permission: AppPermission,
  nextPath: string,
) {
  const user = await requireUser(nextPath);
  const permissions = await getPermissions(user);
  if (!permissions.has(permission)) notFound();
  return { user, permissions };
}
