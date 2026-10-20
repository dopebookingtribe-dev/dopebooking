import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { countryName } from "@/lib/countries";
import { ProductCard } from "@/modules/marketplace/components/product-card";
import { getStorefront } from "@/modules/marketplace/queries";

type Props = PageProps<"/shop/sellers/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStorefront(slug);
  if (!store) return { title: "Shop not found" };
  return {
    title: store.seller.display_name,
    description:
      store.seller.bio?.slice(0, 155) ??
      `Products by ${store.seller.display_name}`,
    alternates: { canonical: `/shop/sellers/${store.seller.slug}` },
  };
}

export default function StorefrontPage({ params }: Props) {
  return (
    <Container className="py-12 sm:py-16">
      <Link href="/shop" className="text-sm text-muted hover:text-text">
        ← Shop
      </Link>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Store params={params} />
      </Suspense>
    </Container>
  );
}

async function Store({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const store = await getStorefront(slug);
  if (!store) notFound();
  const { seller, logo, products } = store;

  return (
    <>
      <header className="mt-8 flex flex-wrap items-center gap-6">
        {logo ? (
          <div className="relative size-20 overflow-hidden rounded-full bg-surface-2">
            <Image
              src={logo.url}
              alt=""
              fill
              sizes="5rem"
              className="object-cover"
            />
          </div>
        ) : null}
        <div>
          <Meta>
            {[countryName(seller.country), `${products.length} products`]
              .filter(Boolean)
              .join(", ")}
          </Meta>
          <h1 className="mt-2 font-display text-headline">
            {seller.display_name}
          </h1>
        </div>
      </header>
      {seller.bio ? (
        <p className="mt-6 max-w-2xl text-lg text-muted">{seller.bio}</p>
      ) : null}
      {seller.website ? (
        <a
          href={seller.website}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-4 inline-block text-sm underline underline-offset-4"
        >
          Website <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : null}
      {products.length ? (
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {products.map((product, index) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                priority={index < 4}
                showSeller={false}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-12 text-muted">No products yet.</p>
      )}
    </>
  );
}
