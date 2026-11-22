"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { AppPermission } from "@/lib/supabase/database.types";
import {
  EDITABLE_PERMISSION_ROLES,
  GRANTABLE_ROLES,
  PERMISSION_LABELS,
} from "./roles";

const roleSchema = z.enum(GRANTABLE_ROLES);

export type RoleResult = { ok: boolean; message: string } | null;

export async function changeRole(
  userId: string,
  _prev: RoleResult,
  formData: FormData,
): Promise<RoleResult> {
  const { user } = await requirePermission("users.manage", "/admin/users");
  const parsedUser = z.uuid().safeParse(userId);
  const role = roleSchema.safeParse(formData.get("role"));
  const grant = formData.get("intent") === "grant";
  if (!parsedUser.success || !role.success) {
    return { ok: false, message: "Choose a valid role." };
  }
  if (!grant && userId === user.id) {
    return { ok: false, message: "You can't remove your own roles." };
  }

  const supabase = await createClient();
  const { error } = grant
    ? await supabase.from("user_roles").insert({
        user_id: userId,
        role: role.data as AppRole,
        granted_by: user.id,
      })
    : await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role.data);
  if (error?.code === "23505")
    return { ok: true, message: "Already has that role." };
  if (error) return { ok: false, message: "That change isn't allowed." };
  revalidatePath("/admin/users");
  return {
    ok: true,
    message: grant ? `Added ${role.data}.` : `Removed ${role.data}.`,
  };
}

/**
 * Grants or removes one permission for an editable role (staff). The admin
 * role keeps every permission; the database also refuses to remove
 * users.manage from it, so nobody can lock the owner out.
 */
export async function setRolePermission(
  role: string,
  permission: string,
  grant: boolean,
): Promise<RoleResult> {
  await requirePermission("users.manage", "/admin/users");
  if (!(EDITABLE_PERMISSION_ROLES as readonly string[]).includes(role)) {
    return { ok: false, message: "That role's permissions are fixed." };
  }
  if (!(permission in PERMISSION_LABELS)) {
    return { ok: false, message: "Unknown permission." };
  }
  const supabase = await createClient();
  const { error } = grant
    ? await supabase.from("role_permissions").insert({
        role: role as AppRole,
        permission: permission as AppPermission,
      })
    : await supabase
        .from("role_permissions")
        .delete()
        .eq("role", role as AppRole)
        .eq("permission", permission as AppPermission);
  if (error && error.code !== "23505") {
    return { ok: false, message: "That change isn't allowed." };
  }
  revalidatePath("/admin/users");
  return {
    ok: true,
    message: `${grant ? "Granted" : "Removed"} ${PERMISSION_LABELS[permission].label} for ${role}.`,
  };
}
