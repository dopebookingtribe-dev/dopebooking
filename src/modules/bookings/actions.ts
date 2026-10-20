"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireUser } from "@/lib/auth/dal";
import { processEmailOutbox } from "@/lib/email/outbox";
import { staffClient } from "@/lib/auth/staff";
import { formValues, invalidForm, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import {
  bookingErrorMessage,
  bookingRequestSchema,
  messageSchema,
  transitionSchema,
} from "./schemas";

// Send the emails this action queued once the response has gone out.
function sendQueuedEmails() {
  after(async () => {
    try {
      await processEmailOutbox();
    } catch (error) {
      console.error("Email outbox run failed", error);
    }
  });
}

export async function createBookingRequest(
  artistId: string,
  artistSlug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/book/${artistSlug}`);
  const parsed = bookingRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .insert({
      ...parsed.data,
      country: parsed.data.country as string,
      artist_id: artistId,
      requester_id: user.id,
    })
    .select("id")
    .single();
  if (error) {
    return {
      status: "error",
      message:
        error.code === "42501"
          ? "This artist can't be booked right now."
          : bookingErrorMessage(error),
      values: formValues(formData),
    };
  }
  sendQueuedEmails();
  redirect(`/dashboard/bookings/${data.id}?sent=1`);
}

/** Requester or staff message; staff may mark it as an internal note. */
export async function sendBookingMessage(
  bookingId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(`/dashboard/bookings/${bookingId}`);
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_booking_message", {
    p_booking: bookingId,
    p_body: parsed.data.body,
    p_internal: parsed.data.internal,
  });
  if (error) {
    return {
      status: "error",
      message: bookingErrorMessage(error),
      values: formValues(formData),
    };
  }
  sendQueuedEmails();
  return { status: "success", message: "Sent." };
}

export async function cancelMyBooking(bookingId: string) {
  await requireUser(`/dashboard/bookings/${bookingId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_booking", {
    p_booking: bookingId,
    p_to: "cancelled",
  });
  if (!error) sendQueuedEmails();
}

export async function changeBookingStatus(
  bookingId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(`/admin/bookings/${bookingId}`);
  const parsed = transitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const { error } = await supabase.rpc("transition_booking", {
    p_booking: bookingId,
    p_to: parsed.data.to,
    p_note: parsed.data.note,
    p_quote_amount: parsed.data.quote_amount,
    p_quote_currency: parsed.data.quote_currency ?? null,
    p_quote_note: parsed.data.quote_note,
  });
  if (error) {
    return {
      status: "error",
      message: bookingErrorMessage(error),
      values: formValues(formData),
    };
  }
  sendQueuedEmails();
  return {
    status: "success",
    message: "Status updated. The requester has been notified.",
  };
}

export async function assignBooking(bookingId: string, staffId: string | null) {
  const { supabase } = await staffClient(`/admin/bookings/${bookingId}`);
  await supabase
    .from("booking_requests")
    .update({ assigned_staff_id: staffId })
    .eq("id", bookingId);
}

export async function markNotificationsRead() {
  const user = await requireUser("/dashboard/notifications");
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
}
