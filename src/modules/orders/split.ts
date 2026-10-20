// Pure money math for multi-seller orders (all amounts in cents).
// The platform charges the buyer once, then transfers each seller their
// share: items minus commission, plus their shipping. Stripe fees are paid
// by the platform from its commission.

export const DEFAULT_COMMISSION_BPS = 1500; // 15 %

export type SplitLine = {
  sellerId: string;
  unitPrice: number;
  quantity: number;
  productType: "physical" | "digital";
};

export type SplitSeller = {
  id: string;
  shippingFlat: number;
  commissionBps: number | null;
};

export type SellerShare = {
  sellerId: string;
  itemsTotal: number;
  shipping: number;
  commissionBps: number;
  commission: number;
  sellerAmount: number;
};

export type OrderSplit = {
  itemsTotal: number;
  shippingTotal: number;
  total: number;
  shares: SellerShare[];
};

/** Commission on items only (never on shipping), rounded half up. */
export function commissionFor(itemsTotal: number, bps: number) {
  return Math.floor((itemsTotal * bps + 5000) / 10000);
}

export function splitOrder(
  lines: SplitLine[],
  sellers: SplitSeller[],
): OrderSplit {
  const byId = new Map(sellers.map((seller) => [seller.id, seller]));
  const shares = new Map<string, SellerShare>();

  for (const line of lines) {
    const seller = byId.get(line.sellerId);
    if (!seller) throw new Error(`Unknown seller ${line.sellerId}`);
    if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0)
      throw new Error("Bad price");
    if (!Number.isInteger(line.quantity) || line.quantity < 1)
      throw new Error("Bad quantity");

    const share = shares.get(seller.id) ?? {
      sellerId: seller.id,
      itemsTotal: 0,
      shipping: 0,
      commissionBps: seller.commissionBps ?? DEFAULT_COMMISSION_BPS,
      commission: 0,
      sellerAmount: 0,
    };
    share.itemsTotal += line.unitPrice * line.quantity;
    // One flat shipping fee per seller, only if something ships.
    if (line.productType === "physical") share.shipping = seller.shippingFlat;
    shares.set(seller.id, share);
  }

  const result = [...shares.values()].map((share) => {
    const commission = commissionFor(share.itemsTotal, share.commissionBps);
    return {
      ...share,
      commission,
      sellerAmount: share.itemsTotal - commission + share.shipping,
    };
  });
  const itemsTotal = result.reduce((sum, share) => sum + share.itemsTotal, 0);
  const shippingTotal = result.reduce((sum, share) => sum + share.shipping, 0);
  return {
    itemsTotal,
    shippingTotal,
    total: itemsTotal + shippingTotal,
    shares: result,
  };
}

/**
 * How much to take back from each seller when `refund` of `total` is
 * refunded: proportional to what each seller was paid, never more than
 * they received, and exactly everything on a full refund.
 */
export function reversalsForRefund(
  shares: {
    sellerId: string;
    sellerAmount: number;
    alreadyReversed?: number;
  }[],
  refund: number,
  total: number,
): { sellerId: string; amount: number }[] {
  if (total <= 0 || refund <= 0)
    return shares.map((s) => ({ sellerId: s.sellerId, amount: 0 }));
  const full = refund >= total;
  return shares.map((share) => {
    const remaining = share.sellerAmount - (share.alreadyReversed ?? 0);
    const amount = full
      ? remaining
      : Math.floor((share.sellerAmount * refund) / total);
    return {
      sellerId: share.sellerId,
      amount: Math.max(0, Math.min(amount, remaining)),
    };
  });
}
