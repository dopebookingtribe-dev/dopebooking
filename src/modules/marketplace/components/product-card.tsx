import Link from "next/link";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import type { ShopCard } from "../queries";
import { formatCents } from "../schemas";

export function ProductCard({
  product,
  priority = false,
  showSeller = true,
  showDemo = true,
}: {
  product: ShopCard;
  priority?: boolean;
  showSeller?: boolean;
  showDemo?: boolean;
}) {
  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius) bg-surface-2">
        {product.cover ? (
          <Picture
            image={product.cover}
            decorative
            priority={priority}
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 92vw"
            className="transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.04]"
          />
        ) : null}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.productType === "digital" ? (
            <span className="rounded-full bg-bg/80 px-2.5 py-0.5 font-label text-xs backdrop-blur-sm">
              Digital
            </span>
          ) : null}
          {!product.inStock ? (
            <span className="rounded-full bg-bg/80 px-2.5 py-0.5 font-label text-xs text-muted backdrop-blur-sm">
              Sold out
            </span>
          ) : null}
          {product.isDemo && showDemo ? <DemoBadge /> : null}
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg leading-snug font-semibold transition-colors group-hover:text-accent">
            {product.title}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {[showSeller ? product.seller.name : null, product.category?.name]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <p className="shrink-0 font-label text-lg">
          {product.fromPrice !== null
            ? formatCents(product.fromPrice, product.currency)
            : ""}
        </p>
      </div>
    </Link>
  );
}
