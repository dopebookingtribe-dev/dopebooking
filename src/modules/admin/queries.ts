import "server-only";
import { hasServiceRole } from "@/lib/env.server";
import type { AppRole, AuditLogRow } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  roles: AppRole[];
  createdAt: string;
};

/** Callers must check users.manage first; emails come from Supabase Auth. */
export async function listUsersForAdmin(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const [profiles, roles] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const emails = new Map<string, string>();
  if (hasServiceRole()) {
    const { data } = await createAdminClient().auth.admin.listUsers({
      perPage: 500,
    });
    for (const user of data?.users ?? []) {
      if (user.email) emails.set(user.id, user.email);
    }
  }
  const byUser = new Map<string, AppRole[]>();
  for (const row of roles.data ?? []) {
    byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row.role]);
  }
  return (profiles.data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.display_name,
    email: emails.get(profile.id) ?? null,
    roles: byUser.get(profile.id) ?? [],
    createdAt: profile.created_at,
  }));
}

export async function listRolePermissions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("role, permission")
    .order("role");
  return data ?? [];
}

export async function listAuditLog(
  limit = 200,
): Promise<(AuditLogRow & { actorName: string | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const actorIds = [
    ...new Set(
      rows.map((row) => row.actor_id).filter((id): id is string => !!id),
    ),
  ];
  const { data: profiles } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  return rows.map((row) => ({
    ...row,
    actorName: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
  }));
}

export async function countDemoContent() {
  const supabase = await createClient();
  const tables = [
    ["artists", "Artists"],
    ["events", "Events"],
    ["galleries", "Galleries"],
    ["videos", "Videos"],
    ["products", "Products"],
    ["product_categories", "Shop categories"],
    ["sellers", "Shops"],
    ["media_assets", "Photos"],
  ] as const;
  const counts = await Promise.all(
    tables.map(async ([table, label]) => {
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("is_demo", true);
      return { table, label, count: count ?? 0 };
    }),
  );
  return counts;
}
