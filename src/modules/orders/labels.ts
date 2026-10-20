import type {
  OrderStatus,
  SellerOrderStatus,
} from "@/lib/supabase/database.types";
import type { Tone } from "@/modules/workflow/types";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> =
  {
    pending_payment: { label: "Awaiting payment", tone: "neutral" },
    paid: { label: "Paid", tone: "accent" },
    fulfilled: { label: "Fulfilled", tone: "success" },
    cancelled: { label: "Cancelled", tone: "muted" },
    refunded: { label: "Refunded", tone: "muted" },
    partially_refunded: { label: "Partly refunded", tone: "uv" },
  };

export const PART_STATUS: Record<
  SellerOrderStatus,
  { label: string; tone: Tone }
> = {
  pending: { label: "Awaiting payment", tone: "neutral" },
  paid: { label: "Preparing", tone: "accent" },
  shipped: { label: "Shipped", tone: "success" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "muted" },
  refunded: { label: "Refunded", tone: "muted" },
};
