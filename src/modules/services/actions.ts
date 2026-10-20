"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { staffClient } from "@/lib/auth/staff";
import { sendQueuedEmailsAfterResponse as sendQueuedEmails } from "@/lib/email/after";
import {
  failedForm,
  formValues,
  invalidForm,
  savedForm,
  type FormState,
} from "@/lib/forms";
import type { ServiceStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { messageSchema, transitionSchema } from "@/modules/bookings/schemas";
import { workflowErrorMessage } from "@/modules/workflow/constants";
import {
  detailsSchema,
  OFFERS,
  providerSchema,
  readDetails,
  serviceRequestSchema,
  type Offer,
} from "./schemas";

export async function createServiceRequest(
  offer: Offer,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/services/${offer}`);
  const multi = Array.from(formData.keys()).filter((key) =>
    key.startsWith("d."),
  );
  const parsed = serviceRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData, multi);

  const type = parsed.data.service_type;
  if (!(OFFERS[offer].types as readonly string[]).includes(type)) {
    return {
      status: "error",
      message: "Choose a service.",
      values: formValues(formData, multi),
    };
  }
  const details = detailsSchema(type).safeParse(readDetails(type, formData));
  if (!details.success) {
    return {
      status: "error",
      fieldErrors: Object.fromEntries(
        details.error.issues.map((issue) => [
          `d.${String(issue.path[0])}`,
          [issue.message],
        ]),
      ),
      values: formValues(formData, multi),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      ...parsed.data,
      country: parsed.data.country as string,
      details: details.data,
      requester_id: user.id,
    })
    .select("id")
    .single();
  if (error) {
    return {
      status: "error",
      message: workflowErrorMessage(error),
      values: formValues(formData, multi),
    };
  }
  sendQueuedEmails();
  redirect(`/dashboard/requests/${data.id}?sent=1`);
}

export async function sendServiceMessage(
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(`/dashboard/requests/${requestId}`);
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_service_request_message", {
    p_request: requestId,
    p_body: parsed.data.body,
    p_internal: parsed.data.internal,
  });
  if (error) {
    return {
      status: "error",
      message: workflowErrorMessage(error),
      values: formValues(formData),
    };
  }
  sendQueuedEmails();
  return { status: "success", message: "Sent." };
}

/** Requester actions: accept a quote or cancel. */
export async function respondToServiceRequest(
  requestId: string,
  to: Extract<ServiceStatus, "accepted" | "cancelled">,
) {
  await requireUser(`/dashboard/requests/${requestId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_service_request", {
    p_request: requestId,
    p_to: to,
  });
  if (!error) sendQueuedEmails();
}

export async function changeServiceStatus(
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(`/admin/services/${requestId}`);
  const parsed = transitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const { error } = await supabase.rpc("transition_service_request", {
    p_request: requestId,
    p_to: parsed.data.to as ServiceStatus,
    p_note: parsed.data.note,
    p_quote_amount: parsed.data.quote_amount,
    p_quote_currency: parsed.data.quote_currency ?? null,
    p_quote_note: parsed.data.quote_note,
  });
  if (error) {
    return {
      status: "error",
      message: workflowErrorMessage(error),
      values: formValues(formData),
    };
  }
  sendQueuedEmails();
  return {
    status: "success",
    message: "Status updated. The requester has been notified.",
  };
}

export async function assignServiceStaff(
  requestId: string,
  staffId: string | null,
) {
  const { supabase } = await staffClient(`/admin/services/${requestId}`);
  await supabase
    .from("service_requests")
    .update({ assigned_staff_id: staffId })
    .eq("id", requestId);
}

export async function assignServiceProvider(
  requestId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(`/admin/services/${requestId}`);
  const providerId = String(formData.get("provider_id") ?? "");
  const { error } = await supabase
    .from("service_requests")
    .update({ assigned_provider_id: providerId === "" ? null : providerId })
    .eq("id", requestId);
  if (error) return failedForm(formData);
  return { status: "success", message: "Saved." };
}

export async function saveProvider(
  providerId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await staffClient(
    providerId ? `/admin/providers/${providerId}` : "/admin/providers",
  );
  const multi = ["services"];
  const parsed = providerSchema.safeParse({
    ...Object.fromEntries(formData),
    services: formData.getAll("services"),
  });
  if (!parsed.success) return invalidForm(parsed.error, formData, multi);

  if (providerId) {
    const { error } = await supabase
      .from("service_providers")
      .update(parsed.data)
      .eq("id", providerId);
    if (error) return failedForm(formData, multi);
    return savedForm(formData, multi);
  }
  const { data, error } = await supabase
    .from("service_providers")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error) return failedForm(formData, multi);
  redirect(`/admin/providers/${data.id}`);
}
