import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, StatusBadge } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { STATUSES } from "@/lib/validation";
import { listProductsForAdmin } from "@/modules/marketplace/admin-queries";
import { CurationForm } from "@/modules/marketplace/components/curation-forms";
import { curateProduct } from "@/modules/marketplace/curation-actions";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Products"
        action={{ href: "/admin/products/new", label: "New product" }}
      />
      <p className="mt-4 max-w-2xl text-muted">
        Create and edit any listing: details, options, prices, stock, photos and
        download files. Sellers keep managing their own listings too. Feature
        products and set their order in the shop below.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Products searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

const control =
  "min-h-11 rounded-lg border border-line-strong bg-bg px-3 text-sm";

async function Products({
  searchParams,
}: {
  searchParams: PageProps<"/admin/products">["searchParams"];
}) {
  await requirePermission("content.manage", "/admin/products");
  const params = await searchParams;
  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const status =
    one("status") in STATUSES
      ? (one("status") as keyof typeof STATUSES)
      : undefined;
  const { products, categories, sellers } = await listProductsForAdmin({
    q: one("q") || undefined,
    status,
    seller: one("seller") || undefined,
  });
  const sellerName = new Map(sellers.map((s) => [s.id, s.display_name]));
  const filtered = Boolean(one("q") || status || one("seller"));

  return (
    <>
      <form
        method="get"
        role="search"
        className="mt-8 grid gap-3 rounded-(--radius) border border-line bg-surface-1 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={one("q")}
            placeholder="Product name"
            className={control}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Status</span>
          <select name="status" defaultValue={status ?? ""} className={control}>
            <option value="">Any</option>
            {Object.entries(STATUSES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Shop</span>
          <select
            name="seller"
            defaultValue={one("seller")}
            className={control}
          >
            <option value="">All shops</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3">
          <button
            type="submit"
            className="min-h-11 rounded-full border border-line-strong px-5 text-sm hover:border-accent hover:text-accent"
          >
            Apply
          </button>
          {filtered ? (
            <Link
              href="/admin/products"
              className="min-h-11 content-center text-sm text-muted underline"
            >
              Reset
            </Link>
          ) : null}
        </div>
      </form>

      {!products.length ? (
        <p className="mt-10 rounded-(--radius) border border-dashed border-line-strong p-8 text-center text-muted">
          {filtered
            ? "No products match."
            : "No products yet. Create the first one."}
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {products.map((product) => (
            <li
              key={product.id}
              className="rounded-(--radius) border border-line p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="font-semibold underline-offset-4 hover:text-accent hover:underline"
                  >
                    {product.title}
                  </Link>
                  {product.is_demo ? (
                    <span className="ml-2 font-label text-xs text-uv">
                      Demo
                    </span>
                  ) : null}
                  <p className="text-sm text-muted">
                    {sellerName.get(product.seller_id) ?? "Unknown shop"} ·{" "}
                    {product.product_type === "digital"
                      ? "Digital"
                      : "Physical"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={product.status} />
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="text-sm underline underline-offset-4"
                  >
                    Edit
                  </Link>
                  {product.status === "published" ? (
                    <Link
                      href={`/shop/${product.slug}`}
                      className="text-sm underline underline-offset-4"
                    >
                      View
                    </Link>
                  ) : null}
                </div>
              </div>
              <CurationForm
                product={product}
                categories={categories}
                action={curateProduct.bind(null, product.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
