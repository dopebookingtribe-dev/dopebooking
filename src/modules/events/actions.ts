"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { staffClient } from "@/lib/auth/staff";
import { zonedInputToUtc } from "@/lib/datetime";
import {
  failedForm,
  formValues,
  invalidForm,
  savedForm,
  slugTakenForm,
  type FormState,
} from "@/lib/forms";
import {
  deleteOwnedImage,
  makeLeadImage,
  registerOwnedImage,
  type ImageResult,
  type RegisterImageInput,
} from "@/modules/media/server";
import { EVENTS_TAG } from "./queries";
import { createEventSchema, eventDetailsSchema, lineupSchema } from "./schemas";

const path = (id?: string) => (id ? `/admin/events/${id}` : "/admin/events");

export async function createEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await staffClient(path());
  const parsed = createEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error?.code === "23505") {
    return {
      status: "error",
      fieldErrors: {
        title: ["An event with this name and year exists already."],
      },
      values: formValues(formData),
    };
  }
  if (error) return failedForm(formData);
  redirect(path(data.id));
}

export async function updateEventDetails(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(path(eventId));
  const parsed = eventDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const { error } = await supabase
    .from("events")
    .update(parsed.data)
    .eq("id", eventId);
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);

  updateTag(EVENTS_TAG);
  return savedForm(formData);
}

export async function saveLineup(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(path(eventId));
  const multi = ["artist_id", "stage", "set_starts_at"];
  const artistIds = formData.getAll("artist_id").map(String);
  const stages = formData.getAll("stage").map(String);
  const times = formData.getAll("set_starts_at").map(String);
  const rows = artistIds
    .map((artist_id, index) => ({
      artist_id,
      stage: stages[index] ?? "",
      set_starts_at: times[index] ?? "",
    }))
    .filter((row) => row.artist_id !== "");

  const parsed = lineupSchema.safeParse(rows);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the lineup.",
      values: formValues(formData, multi),
    };
  }

  const { data: event } = await supabase
    .from("events")
    .select("timezone")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return failedForm(formData, multi);

  const { error: deleteError } = await supabase
    .from("event_artists")
    .delete()
    .eq("event_id", eventId);
  if (deleteError) return failedForm(formData, multi);

  if (parsed.data.length) {
    const { error } = await supabase.from("event_artists").insert(
      parsed.data.map((row, index) => ({
        event_id: eventId,
        artist_id: row.artist_id,
        stage: row.stage,
        set_starts_at: row.set_starts_at
          ? zonedInputToUtc(row.set_starts_at, event.timezone)
          : null,
        sort_order: index,
      })),
    );
    if (error) return failedForm(formData, multi);
  }

  updateTag(EVENTS_TAG);
  return { status: "success", message: "Lineup saved." };
}

export async function registerEventImage(
  eventId: string,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const { user, supabase } = await staffClient(path(eventId));
  const result = await registerOwnedImage(
    supabase,
    user.id,
    "event",
    eventId,
    input,
  );
  if (result.ok) updateTag(EVENTS_TAG);
  return result;
}

export async function setEventCover(eventId: string, assetId: string) {
  const { supabase } = await staffClient(path(eventId));
  if (await makeLeadImage(supabase, "event", eventId, assetId)) {
    updateTag(EVENTS_TAG);
  }
}

export async function deleteEventImage(eventId: string, assetId: string) {
  const { supabase } = await staffClient(path(eventId));
  if (await deleteOwnedImage(supabase, "event", eventId, assetId)) {
    updateTag(EVENTS_TAG);
  }
}
