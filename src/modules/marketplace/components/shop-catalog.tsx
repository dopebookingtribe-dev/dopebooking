import Link from "next/link";
import { Container } from "@/components/ui/container";
import { FilterLink } from "@/modules/artists/components/artist-directory";
import { getSiteSettings } from "@/modules/cms/queries";
import { getShopCategories, getShopProducts } from "../queries";
import { ProductCard } from "./product-card";

const TYPES = [
  { key: "physical", label: "Physical" },
  { key: "digital", label: "Digital" },
] as const;

export async function ShopCatalog({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[];
    category?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const [products, categories, settings] = await Promise.all([
    getShopProducts(),
    getShopCategories(),
    getSiteSettings(),
  ]);
  if (!products.length) {
    return (
      <Container className="py-16">
        <p className="max-w-lg text-lg text-muted">
          The first shops are opening soon.{" "}
          <Link href="/sell" className="text-text underline underline-offset-4">
            Sell with us
          </Link>
        </p>
      </Container>
    );
  }

  const type = TYPES.find((item) => item.key === params.type)?.key ?? null;
  const used = categories.filter((category) =>
    products.some((product) => product.category?.slug === category.slug),
  );
  const category = used.find((item) => item.slug === params.category) ?? null;
  const shown = products.filter(
    (product) =>
      (!type || product.productType === type) &&
      (!category || product.category?.slug === category.slug),
  );
  const href = (next: { type?: string | null; category?: string | null }) => {
    const query = new URLSearchParams();
    const t = next.type === undefined ? type : next.type;
    const c = next.category === undefined ? category?.slug : next.category;
    if (c) query.set("category", c);
    if (t) query.set("type", t);
    const qs = query.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex flex-col gap-4">
        {used.length ? (
          <nav aria-label="Categories">
            <ul className="flex flex-wrap gap-2">
              <li>
                <FilterLink href={href({ category: null })} active={!category}>
                  All products
                </FilterLink>
              </li>
              {used.map((item) => (
                <li key={item.id}>
                  <FilterLink
                    href={href({ category: item.slug })}
                    active={category?.slug === item.slug}
                  >
                    {item.name}
                  </FilterLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <nav aria-label="Product type">
          <ul className="flex flex-wrap gap-2">
            <li>
              <FilterLink href={href({ type: null })} active={!type}>
                Any type
              </FilterLink>
            </li>
            {TYPES.map((item) => (
              <li key={item.key}>
                <FilterLink
                  href={href({ type: item.key })}
                  active={type === item.key}
                >
                  {item.label}
                </FilterLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {category?.description ? (
        <p className="mt-8 max-w-[60ch] text-muted">{category.description}</p>
      ) : null}
      <p className="sr-only" role="status">
        {shown.length} {shown.length === 1 ? "product" : "products"} shown
      </p>
      {shown.length ? (
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
          {shown.map((product, index) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                priority={index < 4}
                showDemo={settings.showDemoLabels}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-muted">
          Nothing here yet.{" "}
          <Link href="/shop" className="text-text underline underline-offset-4">
            Show all products
          </Link>
        </p>
      )}
    </Container>
  );
}
