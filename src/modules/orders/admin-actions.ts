"use server";

import { z } from "zod";
import { staffClient } from "@/lib/auth/staff";
import { sendQueuedEmailsAfterResponse } from "@/lib/email/after";
import { invalidForm, type FormState } from "@/lib/forms";
import { parsePriceToCents } from "@/modules/marketplace/schemas";
import { refundOrder, retryTransfers } from "./server";

const refundSchema = z.object({
  amount: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const cents = parsePriceToCents(value);
      if (cents === null || cents <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "Enter an amount, e.g. 25 or 24.90.",
        });
        return z.NEVER;
      }
      return cents;
    }),
});

export async function refundOrderAction(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await staffClient(`/admin/orders/${orderId}`);
  const parsed = refundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  try {
    const result = await refundOrder(orderId, parsed.data.amount);
    sendQueuedEmailsAfterResponse();
    return {
      status: result.failures.length ? "error" : "success",
      message: result.failures.length
        ? `Refunded, but: ${result.failures.join(" ")}`
        : "Refund sent. Sellers' shares were reversed proportionally.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Refund failed.",
    };
  }
}

export async function retryTransfersAction(
  orderId: string,
): Promise<FormState> {
  await staffClient(`/admin/orders/${orderId}`);
  await retryTransfers(orderId);
  return {
    status: "success",
    message: "Retried. Check the transfer status below.",
  };
}
