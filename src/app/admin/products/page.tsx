import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, StatusBadge } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CurationForm } from "@/modules/marketplace/components/curation-forms";
import { curateProduct } from "@/modules/marketplace/curation-actions";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Products" />
      <p className="mt-4 max-w-2xl text-muted">
        Sellers manage their own listings, prices and stock. Here you choose the
        category, feature products on the site, set their order, archive a
        listing and write search text.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Products />
      </Suspense>
    </Container>
  );
}

async function Products() {
  await requirePermission("content.manage", "/admin/products");
  const supabase = await createClient();
  const [products, categories, sellers] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, title, status, featured, sort_order, category_id, seller_id, is_demo, seo_title, seo_description",
      )
      .order("featured", { ascending: false })
      .order("sort_order")
      .order("updated_at", { ascending: false }),
    supabase.from("product_categories").select("id, name").order("sort_order"),
    supabase.from("sellers").select("id, display_name"),
  ]);
  const sellerName = new Map(
    (sellers.data ?? []).map((s) => [s.id, s.display_name]),
  );
  const rows = products.data ?? [];
  if (!rows.length) return <p className="mt-10 text-muted">No products yet.</p>;
  return (
    <ul className="mt-10 flex flex-col gap-4">
      {rows.map((product) => (
        <li
          key={product.id}
          className="rounded-(--radius) border border-line p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                {product.title}
                {product.is_demo ? (
                  <span className="ml-2 font-label text-xs text-uv">Demo</span>
                ) : null}
              </p>
              <p className="text-sm text-muted">
                {sellerName.get(product.seller_id) ?? "Unknown shop"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={product.status} />
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
            categories={categories.data ?? []}
            action={curateProduct.bind(null, product.id)}
          />
        </li>
      ))}
    </ul>
  );
}
