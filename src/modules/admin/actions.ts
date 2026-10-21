"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { GRANTABLE_ROLES } from "./roles";

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
