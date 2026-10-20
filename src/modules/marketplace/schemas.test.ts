import { describe, expect, it } from "vitest";
import {
  cartSchema,
  createProductSchema,
  formatCents,
  parsePriceToCents,
  reviewSellerSchema,
  sellerApplicationSchema,
  variantsSchema,
} from "./schemas";

describe("parsePriceToCents", () => {
  it.each([
    ["25", 2500],
    ["25.5", 2550],
    ["25,50", 2550],
    ["€ 24.90", 2490],
    ["0.50", 50],
  ])("%s -> %i", (input, cents) => {
    expect(parsePriceToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "25.505", "-5", "1e3", "1,000.00"])(
    "rejects %s",
    (input) => {
      expect(parsePriceToCents(input)).toBeNull();
    },
  );
});

describe("formatCents", () => {
  it("drops .00 but keeps real cents", () => {
    expect(formatCents(2500)).toBe("€25");
    expect(formatCents(2490)).toBe("€24.90");
  });
});

describe("product and variants", () => {
  it("creates with a price in cents", () => {
    expect(
      createProductSchema.parse({
        title: "Ozora Tee",
        product_type: "physical",
        price: "29",
      }),
    ).toEqual({ title: "Ozora Tee", product_type: "physical", price: 2900 });
    expect(
      createProductSchema.safeParse({
        title: "Free",
        product_type: "digital",
        price: "0",
      }).success,
    ).toBe(false);
  });

  it("parses option rows; empty stock means unlimited", () => {
    expect(
      variantsSchema.parse([
        { id: "", name: "M", sku: "", price: "29", stock: "10", active: true },
        {
          id: "",
          name: "Download",
          sku: "",
          price: "9,99",
          stock: "",
          active: true,
        },
      ]),
    ).toEqual([
      { id: null, name: "M", sku: null, price: 2900, stock: 10, active: true },
      {
        id: null,
        name: "Download",
        sku: null,
        price: 999,
        stock: null,
        active: true,
      },
    ]);
    expect(variantsSchema.safeParse([]).success).toBe(false);
  });
});

describe("seller forms", () => {
  it("requires a real application note", () => {
    expect(
      sellerApplicationSchema.safeParse({
        display_name: "Goa Gear",
        country: "",
        website: "",
        bio: "",
        application_note: "pls",
      }).success,
    ).toBe(false);
  });

  it("reads commission as a percentage", () => {
    expect(
      reviewSellerSchema.parse({
        status: "approved",
        note: "",
        commission_percent: "12,5",
      }),
    ).toEqual({ status: "approved", note: null, commission_percent: 12.5 });
  });
});

describe("cartSchema", () => {
  it("caps quantities and rejects bad ids", () => {
    const id = "3f1c1c9e-6c55-4a8a-9d4e-1f7f0a2b3c4d";
    expect(cartSchema.safeParse([{ variantId: id, quantity: 2 }]).success).toBe(
      true,
    );
    expect(
      cartSchema.safeParse([{ variantId: id, quantity: 99 }]).success,
    ).toBe(false);
    expect(
      cartSchema.safeParse([{ variantId: "x", quantity: 1 }]).success,
    ).toBe(false);
  });
});
