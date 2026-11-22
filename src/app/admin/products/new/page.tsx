import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { approvedSellers } from "@/modules/marketplace/admin-queries";
import { AdminCreateProductForm } from "@/modules/marketplace/components/admin-create-product-form";
import { createProductAsStaff } from "@/modules/marketplace/staff-product-actions";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New product"
        backHref="/admin/products"
        backLabel="All products"
      />
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Form />
        </Suspense>
      </div>
    </Container>
  );
}

async function Form() {
  await requirePermission("content.manage", "/admin/products/new");
  const sellers = await approvedSellers();
  if (!sellers.length) {
    return (
      <p className="max-w-xl text-muted">
        Products are sold by a shop, and no shop is approved yet. Approve an
        application under{" "}
        <Link href="/admin/sellers" className="underline underline-offset-4">
          Sellers
        </Link>{" "}
        first (it can be DopeBooking&apos;s own shop).
      </p>
    );
  }
  return (
    <AdminCreateProductForm sellers={sellers} action={createProductAsStaff} />
  );
}
