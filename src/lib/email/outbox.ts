import "server-only";
import { getPublicEnv } from "@/lib/env";
import { getServerEnv, hasEmailSending } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendViaResend } from "./resend";
import { renderEmail } from "./templates";

export type OutboxRun =
  { configured: false } | { configured: true; sent: number; failed: number };

/**
 * Sends queued emails. Safe to run concurrently (rows are claimed with
 * SKIP LOCKED) and repeatedly (Resend idempotency key = outbox row id).
 */
export async function processEmailOutbox(limit = 20): Promise<OutboxRun> {
  if (!hasEmailSending()) return { configured: false };
  const env = getServerEnv();
  const siteUrl = getPublicEnv().NEXT_PUBLIC_SITE_URL;
  const supabase = createAdminClient();

  const { data: batch, error } = await supabase.rpc("claim_email_batch", {
    p_limit: limit,
  });
  if (error) throw new Error(`Could not claim emails: ${error.message}`);

  let sent = 0;
  let failed = 0;
  for (const row of batch ?? []) {
    const email = renderEmail(row.template, row.payload, siteUrl);
    try {
      if (!email) throw new Error(`Unknown template "${row.template}"`);
      const result = await sendViaResend(
        env.RESEND_API_KEY!,
        { from: env.EMAIL_FROM!, to: row.to_email, ...email },
        `outbox-${row.id}`,
      );
      await supabase
        .from("email_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: result.id,
          last_error: null,
        })
        .eq("id", row.id);
      sent++;
    } catch (sendError) {
      // Back off: 5, 10, 15… minutes. claim_email_batch stops after 5 tries.
      await supabase
        .from("email_outbox")
        .update({
          status: "failed",
          last_error: String(sendError).slice(0, 500),
          send_after: new Date(
            Date.now() + row.attempts * 5 * 60_000,
          ).toISOString(),
        })
        .eq("id", row.id);
      failed++;
    }
  }
  return { configured: true, sent, failed };
}
