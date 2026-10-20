import { describe, expect, it } from "vitest";
import {
  commissionFor,
  DEFAULT_COMMISSION_BPS,
  reversalsForRefund,
  splitOrder,
} from "./split";

const sellers = [
  { id: "a", shippingFlat: 590, commissionBps: null },
  { id: "b", shippingFlat: 400, commissionBps: 1000 },
];

describe("commissionFor", () => {
  it("rounds half up", () => {
    expect(commissionFor(1003, 1500)).toBe(150); // 150.45
    expect(commissionFor(1010, 1500)).toBe(152); // 151.5
    expect(commissionFor(0, 1500)).toBe(0);
  });
});

describe("splitOrder", () => {
  it("splits a two-seller cart with shipping and commission", () => {
    const split = splitOrder(
      [
        {
          sellerId: "a",
          unitPrice: 2900,
          quantity: 2,
          productType: "physical",
        },
        { sellerId: "a", unitPrice: 999, quantity: 1, productType: "digital" },
        { sellerId: "b", unitPrice: 1500, quantity: 1, productType: "digital" },
      ],
      sellers,
    );
    expect(split).toEqual({
      itemsTotal: 8299,
      shippingTotal: 590,
      total: 8889,
      shares: [
        {
          sellerId: "a",
          itemsTotal: 6799,
          shipping: 590,
          commissionBps: DEFAULT_COMMISSION_BPS,
          commission: 1020,
          sellerAmount: 6369,
        },
        {
          sellerId: "b",
          itemsTotal: 1500,
          shipping: 0, // digital only: no shipping
          commissionBps: 1000,
          commission: 150,
          sellerAmount: 1350,
        },
      ],
    });
  });

  it("never transfers more than the buyer paid", () => {
    const split = splitOrder(
      [{ sellerId: "a", unitPrice: 51, quantity: 3, productType: "physical" }],
      sellers,
    );
    const paidOut = split.shares.reduce(
      (sum, share) => sum + share.sellerAmount,
      0,
    );
    expect(paidOut).toBeLessThanOrEqual(split.total);
    for (const share of split.shares) {
      expect(share.sellerAmount).toBe(
        share.itemsTotal - share.commission + share.shipping,
      );
    }
  });

  it("rejects unknown sellers and bad numbers", () => {
    expect(() =>
      splitOrder(
        [{ sellerId: "x", unitPrice: 1, quantity: 1, productType: "digital" }],
        sellers,
      ),
    ).toThrow();
    expect(() =>
      splitOrder(
        [{ sellerId: "a", unitPrice: -1, quantity: 1, productType: "digital" }],
        sellers,
      ),
    ).toThrow();
    expect(() =>
      splitOrder(
        [
          {
            sellerId: "a",
            unitPrice: 100,
            quantity: 0,
            productType: "digital",
          },
        ],
        sellers,
      ),
    ).toThrow();
  });
});

describe("reversalsForRefund", () => {
  const shares = [
    { sellerId: "a", sellerAmount: 6369 },
    { sellerId: "b", sellerAmount: 1350 },
  ];

  it("takes back everything on a full refund", () => {
    expect(reversalsForRefund(shares, 8889, 8889)).toEqual([
      { sellerId: "a", amount: 6369 },
      { sellerId: "b", amount: 1350 },
    ]);
  });

  it("is proportional (rounded down) on a partial refund", () => {
    expect(reversalsForRefund(shares, 4444, 8889)).toEqual([
      { sellerId: "a", amount: 3184 },
      { sellerId: "b", amount: 674 },
    ]);
  });

  it("never reverses more than is left", () => {
    expect(
      reversalsForRefund(
        [{ sellerId: "a", sellerAmount: 1000, alreadyReversed: 900 }],
        5000,
        5000,
      ),
    ).toEqual([{ sellerId: "a", amount: 100 }]);
    expect(
      reversalsForRefund(shares, 0, 8889).every((r) => r.amount === 0),
    ).toBe(true);
  });
});
