import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "@/modules/marketplace/components/curation-forms";
import {
  deleteCategory,
  saveCategory,
} from "@/modules/marketplace/curation-actions";

export const metadata: Metadata = { title: "Shop categories" };

export default function CategoriesPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Shop categories" />
      <p className="mt-4 max-w-2xl text-muted">
        Categories group products in the shop and power the category filter and
        the “one category” product section.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Categories />
      </Suspense>
    </Container>
  );
}

async function Categories() {
  await requirePermission("content.manage", "/admin/categories");
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_categories")
    .select("*")
    .order("sort_order")
    .order("name");
  const categories = data ?? [];
  return (
    <>
      <section className="mt-10 rounded-(--radius) border border-line-strong p-5">
        <h2 className="mb-4 font-display text-2xl">New category</h2>
        <CategoryForm action={saveCategory.bind(null, null)} />
      </section>
      <ul className="mt-10 flex flex-col gap-4">
        {categories.map((category) => (
          <li
            key={category.id}
            className="rounded-(--radius) border border-line p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold">
                {category.name}
                {category.is_demo ? (
                  <span className="ml-2 font-label text-xs text-uv">Demo</span>
                ) : null}
              </h2>
              <form action={deleteCategory.bind(null, category.id)}>
                <ConfirmSubmit
                  message={`Delete “${category.name}”? Its products stay, without a category.`}
                  className="min-h-11 text-sm text-muted hover:text-danger"
                >
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
            <CategoryForm
              category={category}
              action={saveCategory.bind(null, category.id)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
