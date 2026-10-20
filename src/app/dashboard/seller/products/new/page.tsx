import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { createProduct } from "@/modules/marketplace/actions";
import { CreateProductForm } from "@/modules/marketplace/components/product-forms";
import { getMySeller } from "@/modules/marketplace/queries";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New product"
        eyebrow="My shop"
        backHref="/dashboard/seller"
        backLabel="My shop"
      />
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Gate />
        </Suspense>
      </div>
    </Container>
  );
}

async function Gate() {
  const { seller } = await getMySeller();
  if (seller?.status !== "approved") notFound();
  return <CreateProductForm action={createProduct} />;
}
