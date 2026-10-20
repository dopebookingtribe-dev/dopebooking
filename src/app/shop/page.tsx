import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { ProductCard } from "@/modules/marketplace/components/product-card";
import { getShopProducts } from "@/modules/marketplace/queries";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Festival fashion, art, music and gear from independent sellers in the psytrance scene.",
  alternates: { canonical: "/shop" },
};

const TYPES = [
  { key: "all", label: "All" },
  { key: "physical", label: "Physical" },
  { key: "digital", label: "Digital" },
] as const;

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <Container className="py-16 sm:py-24">
      <Meta>Marketplace</Meta>
      <h1 className="mt-4 font-display text-display">Shop</h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Independent makers from the scene.{" "}
        <Link href="/sell" className="text-text underline underline-offset-4">
          Sell with us
        </Link>
      </p>
      <Suspense
        fallback={<p className="mt-16 text-muted">Loading products…</p>}
      >
        <Grid searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Grid({
  searchParams,
}: {
  searchParams: PageProps<"/shop">["searchParams"];
}) {
  const raw = (await searchParams).type;
  const type = TYPES.find((item) => item.key === raw)?.key ?? "all";
  const products = await getShopProducts();
  if (!products.length) {
    return (
      <p className="mt-16 text-muted">The first shops are opening soon.</p>
    );
  }
  const shown =
    type === "all"
      ? products
      : products.filter((product) => product.productType === type);

  return (
    <>
      <nav aria-label="Filter products" className="mt-12">
        <ul className="flex flex-wrap gap-2">
          {TYPES.map((item) => (
            <li key={item.key}>
              <Link
                href={item.key === "all" ? "/shop" : `/shop?type=${item.key}`}
                aria-current={type === item.key ? "page" : undefined}
                scroll={false}
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-muted hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {shown.map((product, index) => (
          <li key={product.id}>
            <ProductCard product={product} priority={index < 4} />
          </li>
        ))}
      </ul>
    </>
  );
}
