"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { sendQueuedEmailsAfterResponse as sendQueuedEmails } from "@/lib/email/after";
import { formValues, invalidForm, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import {
  detailsSchema,
  readDetails,
  serviceRequestSchema,
} from "@/modules/services/schemas";
import { workflowErrorMessage } from "@/modules/workflow/constants";

const INQUIRY_PATH = "/art-gallery/collaborate";

/**
 * A collaboration inquiry is a service request of type "art_gallery", so it
 * gets the same quotes, conversation, notifications and emails as every
 * other request, and staff answer it in Admin → Service requests.
 */
export async function createArtInquiry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(INQUIRY_PATH);
  const multi = Array.from(formData.keys()).filter((key) =>
    key.startsWith("d."),
  );
  const parsed = serviceRequestSchema.safeParse({
    ...Object.fromEntries(formData),
    service_type: "art_gallery",
  });
  if (!parsed.success) return invalidForm(parsed.error, formData, multi);

  const details = detailsSchema("art_gallery").safeParse(
    readDetails("art_gallery", formData),
  );
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
      service_type: "art_gallery",
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
