import Image from "next/image";
import Link from "next/link";
import type { ShopCard } from "../queries";
import { formatCents } from "../schemas";

export function ProductCard({
  product,
  priority = false,
  showSeller = true,
}: {
  product: ShopCard;
  priority?: boolean;
  showSeller?: boolean;
}) {
  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius) bg-surface-2">
        {product.cover ? (
          <Image
            src={product.cover.url}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 92vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
          />
        ) : null}
        {product.productType === "digital" ? (
          <span className="absolute top-3 left-3 rounded-full bg-bg/80 px-2 py-0.5 font-label text-xs">
            Digital
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 text-lg font-medium transition-colors group-hover:text-accent">
        {product.title}
      </h3>
      <p className="text-sm text-muted">
        {product.fromPrice !== null
          ? formatCents(product.fromPrice, product.currency)
          : "—"}
        {showSeller ? `, ${product.seller.name}` : ""}
      </p>
    </Link>
  );
}
