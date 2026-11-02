import { describe, expect, it } from "vitest";
import { priceMusicForCheckout } from "./server";

type Row = Record<string, unknown>;

/** Just enough of the Supabase query builder for the checkout reads. */
function fakeClient(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      let rows = tables[table] ?? [];
      const query = {
        select: () => query,
        in: (column: string, values: unknown[]) => {
          rows = rows.filter((row) => values.includes(row[column]));
          return query;
        },
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        is: (column: string, value: unknown) => {
          rows = rows.filter((row) => (row[column] ?? null) === value);
          return query;
        },
        maybeSingle: async () => ({ data: rows[0] ?? null }),
        then: (resolve: (value: { data: Row[] }) => void) =>
          resolve({ data: rows }),
      };
      return query;
    },
  } as unknown as Parameters<typeof priceMusicForCheckout>[0];
}

const release = (id: string, artist: string, extra: Row = {}) => ({
  id,
  title: `Release ${id}`,
  artist_id: artist,
  status: "published",
  on_sale: true,
  price_amount: 199,
  currency: "EUR",
  ...extra,
});

const base = {
  music_releases: [
    release("r1", "a1"),
    release("r2", "a2", { price_amount: 999 }),
    release("r3", "a1", { status: "draft" }),
    release("r4", "a3"),
    release("r5", "a1", { on_sale: false }),
  ],
  artists: [
    { id: "a1", stage_name: "Artist One", status: "published" },
    { id: "a2", stage_name: "Artist Two", status: "published" },
    { id: "a3", stage_name: "Hidden", status: "draft" },
  ],
  artist_private: [{ artist_id: "a2", music_commission_bps: 1000 }],
  platform_settings: [{ key: "music", value: { commission_bps: 2000 } }],
  music_entitlements: [
    { release_id: "r1", buyer_id: "u-owner", revoked_at: null },
  ],
};

describe("priceMusicForCheckout", () => {
  it("snapshots the default and per-artist commission", async () => {
    const { lines, problems } = await priceMusicForCheckout(
      fakeClient(base),
      ["r1", "r2"],
      null,
    );
    expect(problems).toEqual([]);
    expect(lines).toEqual([
      expect.objectContaining({
        releaseId: "r1",
        price: 199,
        commissionBps: 2000,
        commission: 40,
        artistAmount: 159,
      }),
      expect.objectContaining({
        releaseId: "r2",
        price: 999,
        commissionBps: 1000,
        commission: 100,
        artistAmount: 899,
      }),
    ]);
    for (const line of lines)
      expect(line.commission + line.artistAmount).toBe(line.price);
  });

  it("refuses drafts, hidden artists, releases not for sale and unknown ids", async () => {
    const { lines, problems } = await priceMusicForCheckout(
      fakeClient(base),
      ["r3", "r4", "r5", "missing"],
      null,
    );
    expect(lines).toEqual([]);
    expect(problems).toHaveLength(4);
  });

  it("stops buyers paying twice for music they own", async () => {
    const { lines, problems } = await priceMusicForCheckout(
      fakeClient(base),
      ["r1", "r2"],
      "u-owner",
    );
    expect(lines.map((line) => line.releaseId)).toEqual(["r2"]);
    expect(problems[0]).toMatch(/already own/);
  });

  it("counts each release once and falls back to 15 % without settings", async () => {
    const { lines } = await priceMusicForCheckout(
      fakeClient({ ...base, platform_settings: [] }),
      ["r1", "r1"],
      null,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ commissionBps: 1500, commission: 30 });
  });
});
