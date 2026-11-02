"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { hasServiceRole } from "@/lib/env.server";
import {
  failedForm,
  invalidForm,
  savedForm,
  slugTakenForm,
  type FormState,
} from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parsePriceToCents } from "@/modules/marketplace/schemas";
import { MUSIC_TAG } from "./queries";
import { genreSchema, musicSettingsSchema } from "./schemas";

const UUID = /^[0-9a-f-]{36}$/i;

function errorForm(
  error: { code?: string; message: string },
  formData: FormData,
): FormState {
  const readable = ["42501", "22023", "23514", "P0002"].includes(
    error.code ?? "",
  );
  return readable
    ? { ...failedForm(formData), message: error.message }
    : failedForm(formData);
}

// ---------------------------------------------------------------------------
// Catalogue (music.manage)
// ---------------------------------------------------------------------------

const reviewSchema = z.object({
  decision: z.enum(["published", "rejected", "archived"]),
  note: z.string().trim().max(2000),
});

export async function reviewRelease(
  releaseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("music.manage", `/admin/music/${releaseId}`);
  if (!UUID.test(releaseId)) return failedForm(formData);
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_music_release", {
    p_release: releaseId,
    p_status: parsed.data.decision,
    p_note: parsed.data.note || null,
  });
  if (error) return errorForm(error, formData);
  updateTag(MUSIC_TAG);
  return {
    status: "success",
    message:
      parsed.data.decision === "published"
        ? "Published. The artist has been told."
        : parsed.data.decision === "rejected"
          ? "Sent back to the artist with your note."
          : "Archived.",
  };
}

const curationSchema = z.object({
  featured: z
    .string()
    .optional()
    .transform((value) => value === "on"),
  sort_order: z.coerce.number().int().min(-1000).max(1000),
});

export async function saveReleaseCuration(
  releaseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("music.manage", `/admin/music/${releaseId}`);
  if (!UUID.test(releaseId)) return failedForm(formData);
  const parsed = curationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("music_releases")
    .update(parsed.data)
    .eq("id", releaseId);
  if (error) return errorForm(error, formData);
  updateTag(MUSIC_TAG);
  return savedForm(formData);
}

export async function saveGenre(
  genreId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("music.manage", "/admin/music/genres");
  const parsed = genreSchema.safeParse({
    ...Object.fromEntries(formData),
    sort_order: formData.get("sort_order") || "0",
  });
  if (!parsed.success) return invalidForm(parsed.error, formData);
  if (genreId && parsed.data.parent_id === genreId) {
    return {
      ...failedForm(formData),
      message: "A genre can't sit inside itself.",
    };
  }
  const supabase = await createClient();
  const { error } = genreId
    ? await supabase.from("music_genres").update(parsed.data).eq("id", genreId)
    : await supabase.from("music_genres").insert(parsed.data);
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return errorForm(error, formData);
  updateTag(MUSIC_TAG);
  return genreId
    ? savedForm(formData)
    : { status: "success", message: "Genre added." };
}

export async function deleteGenre(genreId: string) {
  await requirePermission("music.manage", "/admin/music/genres");
  if (!UUID.test(genreId)) return;
  const supabase = await createClient();
  // Releases keep existing; their genre clears (on delete set null).
  await supabase.from("music_genres").delete().eq("id", genreId);
  updateTag(MUSIC_TAG);
}

const memberSchema = z.object({
  email: z.email("Enter the account's email address.").trim().toLowerCase(),
  member_role: z.enum(["owner", "manager"]),
});

/** Links a registered account to an artist so they can sell music. */
export async function addArtistMember(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("music.manage", "/admin/music/artists");
  if (!UUID.test(artistId)) return failedForm(formData);
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  if (!hasServiceRole()) {
    return {
      ...failedForm(formData),
      message: "Account lookup isn't configured.",
    };
  }
  const { data } = await createAdminClient().auth.admin.listUsers({
    perPage: 1000,
  });
  const account = data?.users.find(
    (user) => user.email?.toLowerCase() === parsed.data.email,
  );
  if (!account) {
    return {
      ...failedForm(formData),
      message: undefined,
      fieldErrors: {
        email: ["No account with this email. Ask the artist to sign up first."],
      },
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("artist_members").upsert({
    artist_id: artistId,
    user_id: account.id,
    member_role: parsed.data.member_role,
  });
  if (error) return errorForm(error, formData);
  // Notifications are written by the server only.
  await createAdminClient().from("notifications").insert({
    user_id: account.id,
    type: "music_team",
    title: "You can now sell music",
    body: "Your account was linked to an artist profile. Open My Music to upload releases.",
    link: "/dashboard/music",
  });
  return { status: "success", message: "Account linked." };
}

export async function removeArtistMember(artistId: string, userId: string) {
  await requirePermission("music.manage", "/admin/music/artists");
  if (!UUID.test(artistId) || !UUID.test(userId)) return;
  const supabase = await createClient();
  await supabase
    .from("artist_members")
    .delete()
    .eq("artist_id", artistId)
    .eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Money (finance.manage)
// ---------------------------------------------------------------------------

export async function saveMusicSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requirePermission(
    "finance.manage",
    "/admin/music/finance",
  );
  const parsed = musicSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({
      value: {
        commission_bps: Math.round(parsed.data.commission_percent * 100),
        hold_days: parsed.data.hold_days,
        min_withdrawal: parsed.data.min_withdrawal!,
      },
      updated_by: user.id,
    })
    .eq("key", "music");
  if (error) return errorForm(error, formData);
  return savedForm(formData);
}

const commissionSchema = z.object({
  commission_percent: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .refine(
      (value) =>
        value === null || (Number.isFinite(value) && value >= 0 && value <= 50),
      { message: "Use 0 to 50, or leave empty for the default." },
    ),
});

/** Per-artist commission; empty uses the platform default. */
export async function setArtistCommission(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("finance.manage", "/admin/music/artists");
  if (!UUID.test(artistId)) return failedForm(formData);
  const parsed = commissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const percent = parsed.data.commission_percent;
  const { error } = await supabase.from("artist_private").upsert({
    artist_id: artistId,
    music_commission_bps: percent === null ? null : Math.round(percent * 100),
  });
  if (error) return errorForm(error, formData);
  return savedForm(formData);
}

const adjustmentSchema = z.object({
  amount: z
    .string()
    .trim()
    .transform((value) => {
      const negative = value.startsWith("-");
      const cents = parsePriceToCents(value.replace(/^[-+]/, ""));
      return cents === null ? null : negative ? -cents : cents;
    })
    .refine((value) => value !== null && value !== 0, {
      message: "Enter an amount like 10.00 or -10.00.",
    }),
  note: z.string().trim().min(3, "Explain the adjustment.").max(500),
});

export async function addAdjustment(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("finance.manage", "/admin/music/finance");
  if (!UUID.test(artistId)) return failedForm(formData);
  const parsed = adjustmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_ledger_adjustment", {
    p_artist: artistId,
    p_amount: parsed.data.amount!,
    p_note: parsed.data.note,
  });
  if (error) return errorForm(error, formData);
  return { status: "success", message: "Adjustment added to the ledger." };
}

const decisionSchema = z.object({
  status: z.enum(["approved", "paid", "rejected"]),
  note: z.string().trim().max(1000),
  reference: z.string().trim().max(120),
});

export async function decideWithdrawal(
  withdrawalId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("finance.manage", "/admin/music/finance");
  if (!UUID.test(withdrawalId)) return failedForm(formData);
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_withdrawal", {
    p_withdrawal: withdrawalId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || null,
    p_reference: parsed.data.reference || null,
  });
  if (error) return errorForm(error, formData);
  return { status: "success", message: "Withdrawal updated." };
}
