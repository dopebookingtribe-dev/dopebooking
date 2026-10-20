import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { AddToCart } from "@/modules/marketplace/components/add-to-cart";
import { getShopProduct } from "@/modules/marketplace/queries";

type Props = PageProps<"/shop/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getShopProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.title,
    description:
      product.description?.slice(0, 155) ??
      `${product.title} by ${product.seller.name}`,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      images: product.cover
        ? [{ url: product.cover.url, alt: product.cover.alt }]
        : undefined,
    },
  };
}

export default function ProductPage({ params }: Props) {
  return (
    <Container className="py-12 sm:py-16">
      <Link href="/shop" className="text-sm text-muted hover:text-text">
        ← Shop
      </Link>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Product params={params} />
      </Suspense>
    </Container>
  );
}

async function Product({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const product = await getShopProduct(slug);
  if (!product) notFound();
  const paragraphs = (product.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images.map((image) => image.url),
    description: product.description ?? undefined,
    brand: { "@type": "Brand", name: product.seller.name },
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      name: variant.name,
      price: (variant.price / 100).toFixed(2),
      priceCurrency: product.currency,
      availability: variant.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: new URL(`/shop/${product.slug}`, siteUrl).toString(),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
        <div className="flex flex-col gap-4">
          {product.images.length ? (
            product.images.map((image, index) => (
              <Image
                key={image.id}
                src={image.url}
                alt={image.alt}
                width={image.width}
                height={image.height}
                priority={index === 0}
                sizes="(min-width: 1024px) 55vw, 92vw"
                className="h-auto w-full rounded-(--radius)"
              />
            ))
          ) : (
            <div className="aspect-[4/5] rounded-(--radius) bg-surface-2" />
          )}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Meta>
            <Link
              href={`/shop/sellers/${product.seller.slug}`}
              className="hover:text-text"
            >
              {product.seller.name}
            </Link>
            {product.productType === "digital" ? " · Digital download" : ""}
          </Meta>
          <h1 className="mt-4 font-display text-headline">{product.title}</h1>
          <div className="mt-8">
            <AddToCart
              variants={product.variants}
              currency={product.currency}
            />
          </div>
          {paragraphs.length ? (
            <div className="mt-10 flex flex-col gap-4 border-t border-line pt-8 leading-relaxed text-muted">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
