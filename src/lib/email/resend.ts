import "server-only";

/** Minimal Resend API client (https://resend.com/docs/api-reference). */
export async function sendViaResend(
  apiKey: string,
  message: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  },
  idempotencyKey: string,
): Promise<{ id: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // Retries of the same outbox row never send twice.
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend ${response.status}: ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as { id: string };
}
