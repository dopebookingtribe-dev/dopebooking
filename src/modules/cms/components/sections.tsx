import Link from "next/link";
import type { ReactNode } from "react";
import { StringArt } from "@/components/site/string-art";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Picture } from "@/components/ui/picture";
import {
  ArtistCard,
  ArtistRow,
} from "@/modules/artists/components/artist-card";
import { getPublishedArtists } from "@/modules/artists/queries";
import { EventFeature } from "@/modules/events/components/event-feature";
import { EventRow } from "@/modules/events/components/event-row";
import { getPublishedEvents } from "@/modules/events/queries";
import { PhotoGrid } from "@/modules/galleries/components/photo-grid";
import { ProductCard } from "@/modules/marketplace/components/product-card";
import { getShopProducts } from "@/modules/marketplace/queries";
import { VideoCard } from "@/modules/videos/components/video-card";
import { getPublishedVideos } from "@/modules/videos/queries";
import type { CmsImage } from "../queries";
import type { CmsLink, SectionOf, SectionType } from "../schema";

export type SectionProps<T extends SectionType> = {
  section: SectionOf<T>;
  images: Record<string, CmsImage>;
  showDemo: boolean;
  /** True in the admin preview: empty sections explain themselves. */
  preview: boolean;
  first: boolean;
};

export function sectionLabel(type: SectionType) {
  return {
    hero: "Hero banner",
    artists: "Artists",
    events: "Events",
    gallery: "Photo gallery",
    videos: "Videos",
    products: "Products",
    services: "Services",
    editorial: "Text and image",
    packages: "Packages",
    stats: "Key facts",
    steps: "Steps",
    cta: "Call to action",
    portfolio: "Portfolio",
    faq: "Questions and answers",
    contact: "Contact",
    builtin: "Built-in block",
  }[type];
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

const hasLink = (link: CmsLink) => link.label !== "" && link.href !== "";

/** Plain text with blank lines between paragraphs. No HTML is ever rendered. */
export function Paragraphs({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/\n\s*\n/).filter((part) => part.trim());
  return (
    <>
      {parts.map((part, index) => (
        <p key={index} className={`whitespace-pre-line ${className}`}>
          {part}
        </p>
      ))}
    </>
  );
}

function Shell({
  id,
  label,
  band = false,
  children,
}: {
  id: string;
  label: string;
  band?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className={`scroll-mt-20 py-20 sm:py-28 ${band ? "bg-surface-1" : ""}`}
    >
      <Container>{children}</Container>
    </section>
  );
}

function Header({
  heading,
  body,
  link,
}: {
  heading: string;
  body?: string;
  link?: CmsLink;
}) {
  if (!heading && !body && !(link && hasLink(link))) return null;
  return (
    <div className="mb-12 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 sm:mb-14">
      <div className="max-w-3xl">
        {heading ? (
          <h2 className="font-display text-headline text-balance">{heading}</h2>
        ) : null}
        {body ? (
          <p className="mt-5 max-w-[60ch] text-lg text-muted">{body}</p>
        ) : null}
      </div>
      {link && hasLink(link) ? (
        <ButtonLink href={link.href} variant="text">
          {link.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

function Ctas({
  primary,
  secondary,
  size = "lg",
}: {
  primary: CmsLink;
  secondary?: CmsLink;
  size?: "md" | "lg";
}) {
  if (!hasLink(primary) && !(secondary && hasLink(secondary))) return null;
  return (
    <div className="mt-10 flex flex-wrap gap-3">
      {hasLink(primary) ? (
        <ButtonLink href={primary.href} size={size}>
          {primary.label}
        </ButtonLink>
      ) : null}
      {secondary && hasLink(secondary) ? (
        <ButtonLink href={secondary.href} variant="secondary" size={size}>
          {secondary.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

function EmptyNote({ preview, text }: { preview: boolean; text: string }) {
  if (!preview) return null;
  return (
    <Container className="py-10">
      <p className="rounded-(--radius) border border-dashed border-uv/60 p-6 text-sm text-uv">
        {text}
      </p>
    </Container>
  );
}

/** A thin pink outline offset behind an image, like a thread frame. */
function FramedImage({
  image,
  sizes,
  aspect = "aspect-[4/5]",
  priority = false,
}: {
  image: CmsImage;
  sizes: string;
  aspect?: string;
  priority?: boolean;
}) {
  return (
    <figure className="relative">
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-(--radius) border border-accent/60"
      />
      <div
        className={`relative overflow-hidden rounded-(--radius) bg-surface-2 ${aspect}`}
      >
        <Picture image={image} sizes={sizes} priority={priority} />
      </div>
      {image.credit ? (
        <figcaption className="mt-5 font-label text-sm text-muted">
          Photo: {image.credit}
        </figcaption>
      ) : null}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export function HeroSection({ section, images, first }: SectionProps<"hero">) {
  const c = section.content;
  const image = c.image ? images[c.image] : undefined;
  const layout =
    (c.layout === "image" || c.layout === "split") && !image
      ? "string-art"
      : c.layout;
  const Heading = first ? "h1" : "h2";

  if (layout === "compact") {
    return (
      <section
        id={section.id}
        className="relative isolate overflow-hidden border-b border-line"
      >
        <StringArt className="pointer-events-none absolute -top-1/3 -right-40 -z-10 hidden w-[34rem] max-w-none opacity-35 md:block" />
        <Container className="py-16 sm:py-24">
          <Heading className="max-w-4xl font-display text-display text-balance">
            {c.heading}
          </Heading>
          {c.body ? (
            <p className="mt-6 max-w-[56ch] text-lg text-muted">{c.body}</p>
          ) : null}
          <Ctas primary={c.primary} secondary={c.secondary} size="md" />
          {image ? (
            <div className="relative mt-12 aspect-[16/9] overflow-hidden rounded-(--radius) bg-surface-2 sm:aspect-[21/9]">
              <Picture image={image} sizes="100vw" priority={first} />
            </div>
          ) : null}
        </Container>
      </section>
    );
  }

  if (layout === "image" && image) {
    const overlay = c.overlay;
    return (
      <section
        id={section.id}
        className="relative isolate flex min-h-[88svh] items-end overflow-hidden border-b border-line"
      >
        <Picture
          image={image}
          sizes="100vw"
          priority={first}
          className="-z-20"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(to top, var(--bg) 0%, color-mix(in oklab, var(--bg) ${overlay}%, transparent) 42%, color-mix(in oklab, var(--bg) ${Math.round(overlay / 3)}%, transparent) 100%), linear-gradient(to right, color-mix(in oklab, var(--bg) ${overlay}%, transparent), transparent 70%)`,
          }}
        />
        <Container className="pt-40 pb-16 sm:pb-24">
          <Heading className="max-w-[13ch] font-display text-display text-balance">
            {c.heading}
          </Heading>
          {c.body ? (
            <p className="mt-8 max-w-[34rem] text-lg text-text/85">{c.body}</p>
          ) : null}
          <Ctas primary={c.primary} secondary={c.secondary} />
          {image.credit ? (
            <p className="mt-12 font-label text-sm text-muted">
              Photo: {image.credit}
            </p>
          ) : null}
        </Container>
      </section>
    );
  }

  if (layout === "split" && image) {
    return (
      <section
        id={section.id}
        className="relative isolate overflow-hidden border-b border-line"
      >
        <StringArt className="pointer-events-none absolute -bottom-1/3 -left-60 -z-10 w-[40rem] max-w-none opacity-20" />
        <Container className="grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <div>
            <Heading className="font-display text-display text-balance">
              {c.heading}
            </Heading>
            {c.body ? (
              <p className="mt-8 max-w-[34rem] text-lg text-muted">{c.body}</p>
            ) : null}
            <Ctas primary={c.primary} secondary={c.secondary} />
          </div>
          <FramedImage
            image={image}
            priority={first}
            sizes="(min-width: 1024px) 45vw, 92vw"
          />
        </Container>
      </section>
    );
  }

  // String-art hero: the brand's signature, used when no photo is chosen.
  return (
    <section
      id={section.id}
      className="relative isolate overflow-hidden border-b border-line"
    >
      <StringArt className="pointer-events-none absolute top-0 -right-[30%] -z-10 w-[92%] max-w-none -translate-y-[16%] opacity-90 sm:top-1/2 sm:-right-[40%] sm:w-[85%] sm:-translate-y-1/2 sm:opacity-50 lg:-right-[6%] lg:w-[56%] lg:opacity-100" />
      <Container className="flex min-h-[82svh] flex-col justify-end pt-40 pb-16 sm:justify-center sm:py-28">
        <Heading className="max-w-[11ch] font-display text-display text-balance">
          {c.heading}
        </Heading>
        {c.body ? (
          <p className="mt-8 max-w-[34rem] text-lg text-muted">{c.body}</p>
        ) : null}
        <Ctas primary={c.primary} secondary={c.secondary} />
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Data-driven sections
// ---------------------------------------------------------------------------

export async function ArtistsSection({
  section,
  showDemo,
  preview,
}: SectionProps<"artists">) {
  const c = section.content;
  const all = await getPublishedArtists();
  const chosen =
    c.source === "pick"
      ? c.artistIds.flatMap((id) => all.filter((artist) => artist.id === id))
      : c.source === "featured"
        ? all.filter((artist) => artist.featured)
        : all;
  const artists = (chosen.length ? chosen : all).slice(0, c.limit);
  if (!artists.length) {
    return (
      <EmptyNote
        preview={preview}
        text="Artists section: hidden until at least one artist is published."
      />
    );
  }

  const [lead, ...rest] = artists;
  return (
    <Shell id={section.id} label={c.heading || "Artists"}>
      <Header heading={c.heading} body={c.body} link={c.link} />
      {c.layout === "editorial" && artists.length >= 2 ? (
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <ArtistCard
              artist={lead}
              size="feature"
              headingLevel={3}
              showDemo={showDemo}
            />
          </div>
          <ul className="flex flex-col divide-y divide-line border-y border-line lg:col-span-5 lg:self-center">
            {rest.map((artist) => (
              <li key={artist.id}>
                <ArtistRow artist={artist} showDemo={showDemo} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {artists.map((artist) => (
            <li key={artist.id}>
              <ArtistCard
                artist={artist}
                headingLevel={3}
                showDemo={showDemo}
              />
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

export async function EventsSection({
  section,
  showDemo,
  preview,
}: SectionProps<"events">) {
  const c = section.content;
  const { upcoming, past } = await getPublishedEvents();
  const events = (c.when === "upcoming" ? upcoming : past).slice(0, c.limit);
  if (!events.length) {
    return (
      <EmptyNote
        preview={preview}
        text={`Events section: hidden until there are ${c.when} published events.`}
      />
    );
  }
  const [lead, ...rest] = events;
  return (
    <Shell id={section.id} label={c.heading || "Events"}>
      <Header heading={c.heading} body={c.body} link={c.link} />
      {c.layout === "showcase" ? (
        <>
          <EventFeature event={lead} showDemo={showDemo} />
          {rest.length ? (
            <ul className="mt-4 grid gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-6">
              {rest.map((event) => (
                <li key={event.id}>
                  <EventFeature event={event} showDemo={showDemo} compact />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <ul className="border-t border-line">
          {events.map((event) => (
            <li key={event.id}>
              <EventRow event={event} />
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

export function GallerySection({
  section,
  images,
  preview,
}: SectionProps<"gallery">) {
  const c = section.content;
  const photos = c.images.flatMap((id) => (images[id] ? [images[id]] : []));
  if (!photos.length) {
    return (
      <EmptyNote
        preview={preview}
        text="Photo gallery: hidden until you choose photos from the media library."
      />
    );
  }
  return (
    <Shell id={section.id} label={c.heading || "Photos"}>
      <Header heading={c.heading} body={c.body} link={c.link} />
      <PhotoGrid images={photos} layout={c.layout} />
    </Shell>
  );
}

export async function VideosSection({
  section,
  preview,
}: SectionProps<"videos">) {
  const c = section.content;
  const videos = (await getPublishedVideos()).slice(0, c.limit);
  if (!videos.length) {
    return (
      <EmptyNote
        preview={preview}
        text="Videos section: hidden until a video is published (Admin, Videos)."
      />
    );
  }
  const [lead, ...rest] = videos;
  return (
    <Shell id={section.id} label={c.heading || "Videos"} band>
      <Header heading={c.heading} body={c.body} link={c.link} />
      {c.layout === "feature" && rest.length ? (
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <VideoCard video={lead} />
          <ul className="flex flex-col gap-8">
            {rest.map((video) => (
              <li key={video.id}>
                <VideoCard video={video} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <li key={video.id}>
              <VideoCard video={video} />
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

export async function ProductsSection({
  section,
  showDemo,
  preview,
}: SectionProps<"products">) {
  const c = section.content;
  const all = await getShopProducts();
  const chosen =
    c.source === "featured"
      ? all.filter((product) => product.featured)
      : c.source === "category"
        ? all.filter((product) => product.category?.slug === c.categorySlug)
        : all;
  const products = (chosen.length ? chosen : all).slice(0, c.limit);
  if (!products.length) {
    return (
      <EmptyNote
        preview={preview}
        text="Products section: hidden until a product is published in the shop."
      />
    );
  }
  return (
    <Shell id={section.id} label={c.heading || "Shop"}>
      <Header heading={c.heading} body={c.body} link={c.link} />
      <ul className="-mx-(--gutter) flex snap-x snap-mandatory gap-4 overflow-x-auto px-(--gutter) pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {products.map((product) => (
          <li
            key={product.id}
            className="w-[72vw] shrink-0 snap-start sm:w-auto"
          >
            <ProductCard product={product} showDemo={showDemo} />
          </li>
        ))}
      </ul>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Content sections
// ---------------------------------------------------------------------------

export function ServicesSection({ section, images }: SectionProps<"services">) {
  const c = section.content;
  if (!c.items.length) return null;

  if (c.layout === "rows") {
    return (
      <Shell id={section.id} label={c.heading || "Services"}>
        <Header heading={c.heading} body={c.body} />
        <ul className="border-t border-line">
          {c.items.map((item) => {
            const image = item.image ? images[item.image] : undefined;
            const inner = (
              <>
                <h3 className="font-display text-3xl transition-colors group-hover:text-accent sm:text-4xl">
                  {item.title}
                </h3>
                <div>
                  <p className="max-w-[60ch] text-muted">{item.body}</p>
                  {item.href ? (
                    <span className="mt-4 inline-block text-sm font-semibold text-accent underline underline-offset-4">
                      Learn more and request a quote
                    </span>
                  ) : null}
                </div>
                {image ? (
                  <div className="relative hidden aspect-[3/2] overflow-hidden rounded-(--radius) bg-surface-2 md:block">
                    <Picture
                      image={image}
                      decorative
                      sizes="16rem"
                      className="transition-transform duration-700 ease-(--ease-out) group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <span aria-hidden className="hidden md:block" />
                )}
              </>
            );
            const className =
              "group grid gap-3 border-b border-line py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_14rem] md:items-center md:gap-10";
            return (
              <li key={item.title}>
                {item.href ? (
                  <Link href={item.href} className={className}>
                    {inner}
                  </Link>
                ) : (
                  <div className={className}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Shell>
    );
  }

  return (
    <Shell id={section.id} label={c.heading || "Services"}>
      <Header heading={c.heading} body={c.body} />
      <ul className="grid gap-6 md:grid-cols-3">
        {c.items.map((item, index) => {
          const image = item.image ? images[item.image] : undefined;
          const inner = (
            <>
              <div className="relative aspect-[4/3] overflow-hidden rounded-(--radius) bg-surface-2">
                {image ? (
                  <Picture
                    image={image}
                    decorative
                    sizes="(min-width: 768px) 30vw, 92vw"
                    className="transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.04]"
                  />
                ) : (
                  <StringArt
                    className="absolute inset-0 m-auto size-[80%] opacity-60"
                    variant={index}
                  />
                )}
              </div>
              <h3 className="mt-6 font-display text-2xl leading-tight transition-colors group-hover:text-accent">
                {item.title}
              </h3>
              <p className="mt-3 text-muted">{item.body}</p>
            </>
          );
          return (
            <li key={item.title}>
              {item.href ? (
                <Link href={item.href} className="group block">
                  {inner}
                </Link>
              ) : (
                <div>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

export function EditorialSection({
  section,
  images,
}: SectionProps<"editorial">) {
  const c = section.content;
  const image = c.image ? images[c.image] : undefined;
  const text = (
    <div>
      <h2 className="font-display text-headline text-balance">{c.heading}</h2>
      <div className="mt-8 flex max-w-[60ch] flex-col gap-5 text-lg leading-relaxed text-muted">
        <Paragraphs text={c.body} />
      </div>
      {hasLink(c.link) ? (
        <ButtonLink href={c.link.href} variant="secondary" className="mt-10">
          {c.link.label}
        </ButtonLink>
      ) : null}
    </div>
  );
  return (
    <Shell id={section.id} label={c.heading}>
      {image ? (
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
          <div className={c.imageSide === "left" ? "lg:order-2" : ""}>
            {text}
          </div>
          <FramedImage image={image} sizes="(min-width: 1024px) 45vw, 92vw" />
        </div>
      ) : (
        <div className="max-w-4xl">{text}</div>
      )}
    </Shell>
  );
}

export function PackagesSection({ section }: SectionProps<"packages">) {
  const c = section.content;
  if (!c.items.length) return null;
  return (
    <Shell id={section.id} label={c.heading || "Packages"} band>
      <Header heading={c.heading} body={c.body} />
      <ul className="grid gap-6 lg:grid-cols-3">
        {c.items.map((item) => (
          <li
            key={item.name}
            className={`flex flex-col rounded-(--radius) border p-7 sm:p-8 ${
              item.highlighted
                ? "border-accent bg-bg shadow-[0_0_48px_-12px_color-mix(in_oklab,var(--accent)_45%,transparent)]"
                : "border-line bg-bg/60"
            }`}
          >
            <h3 className="font-display text-2xl">{item.name}</h3>
            {item.price ? (
              <p className="mt-3 font-label text-2xl text-accent">
                {item.price}
              </p>
            ) : null}
            {item.summary ? (
              <p className="mt-4 text-muted">{item.summary}</p>
            ) : null}
            {item.features.length ? (
              <ul className="mt-6 flex flex-col gap-3 border-t border-line pt-6 text-sm">
                {item.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2.5 h-px w-3 shrink-0 bg-accent"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            ) : null}
            {hasLink(item.cta) ? (
              <div className="mt-auto pt-8">
                <ButtonLink
                  href={item.cta.href}
                  variant={item.highlighted ? "primary" : "secondary"}
                >
                  {item.cta.label}
                </ButtonLink>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function StatsSection({ section }: SectionProps<"stats">) {
  const c = section.content;
  if (!c.items.length) return null;
  return (
    <Shell id={section.id} label={c.heading || "Key facts"}>
      <Header heading={c.heading} body={c.body} />
      <dl className="grid gap-10 sm:grid-cols-3">
        {c.items.map((item) => (
          <div key={item.label} className="border-t-2 border-accent pt-6">
            <dt className="sr-only">{item.label}</dt>
            <dd>
              <span className="block font-label text-7xl leading-none sm:text-8xl">
                {item.value}
              </span>
              <span className="mt-4 block max-w-[28ch] text-muted">
                {item.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </Shell>
  );
}

export function StepsSection({ section }: SectionProps<"steps">) {
  const c = section.content;
  if (!c.items.length) return null;
  return (
    <Shell id={section.id} label={c.heading || "Steps"} band>
      <Header heading={c.heading} />
      <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
        {c.items.map((step, index) => (
          <li key={step.title} className="border-t-2 border-accent pt-6">
            <p aria-hidden className="font-label text-5xl text-accent">
              {index + 1}
            </p>
            <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
            <p className="mt-2 max-w-[32ch] text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Shell>
  );
}

export function CtaSection({ section, images }: SectionProps<"cta">) {
  const c = section.content;
  const image = c.image ? images[c.image] : undefined;
  if (c.layout === "image" && image) {
    return (
      <section
        id={section.id}
        aria-label={c.heading}
        className="relative isolate overflow-hidden"
      >
        <Picture image={image} sizes="100vw" decorative className="-z-20" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-r from-bg via-bg/80 to-bg/30"
        />
        <Container className="py-28 sm:py-36">
          <h2 className="max-w-[16ch] font-display text-headline text-balance">
            {c.heading}
          </h2>
          {c.body ? (
            <p className="mt-6 max-w-[44ch] text-lg text-text/85">{c.body}</p>
          ) : null}
          <Ctas primary={c.primary} secondary={c.secondary} />
        </Container>
      </section>
    );
  }
  return (
    <section
      id={section.id}
      aria-label={c.heading}
      className="relative isolate overflow-hidden border-y border-line"
    >
      <StringArt className="pointer-events-none absolute top-1/2 -right-48 -z-10 w-[36rem] max-w-none -translate-y-1/2 opacity-40 sm:-right-24 sm:opacity-80" />
      <Container className="py-24 sm:py-32">
        <h2 className="max-w-[16ch] font-display text-headline text-balance">
          {c.heading}
        </h2>
        {c.body ? (
          <p className="mt-6 max-w-[44ch] text-lg text-muted">{c.body}</p>
        ) : null}
        <Ctas primary={c.primary} secondary={c.secondary} />
      </Container>
    </section>
  );
}

export function PortfolioSection({
  section,
  images,
}: SectionProps<"portfolio">) {
  const c = section.content;
  if (!c.items.length) return null;
  return (
    <Shell id={section.id} label={c.heading || "Portfolio"}>
      <Header heading={c.heading} body={c.body} />
      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {c.items.map((item, index) => {
          const image = item.image ? images[item.image] : undefined;
          const inner = (
            <>
              <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius) bg-surface-2">
                {image ? (
                  <Picture
                    image={image}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                    className="transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.04]"
                  />
                ) : (
                  <StringArt
                    className="absolute inset-0 m-auto size-[75%] opacity-50"
                    variant={index}
                  />
                )}
              </div>
              {item.role ? (
                <p className="mt-5 font-label text-sm text-accent">
                  {item.role}
                </p>
              ) : null}
              <h3 className="mt-1 font-display text-2xl leading-tight transition-colors group-hover:text-accent">
                {item.name}
              </h3>
              {item.body ? (
                <p className="mt-3 text-muted">{item.body}</p>
              ) : null}
            </>
          );
          return (
            <li key={`${item.name}-${index}`}>
              {item.href ? (
                <Link href={item.href} className="group block">
                  {inner}
                </Link>
              ) : (
                <div className="group">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

export function FaqSection({ section }: SectionProps<"faq">) {
  const c = section.content;
  if (!c.items.length) return null;
  return (
    <Shell id={section.id} label={c.heading || "Questions"}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
        <h2 className="font-display text-headline lg:sticky lg:top-28 lg:self-start">
          {c.heading || "Questions"}
        </h2>
        <ul className="border-t border-line">
          {c.items.map((item) => (
            <li key={item.question} className="border-b border-line">
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden
                    className="relative size-4 shrink-0 before:absolute before:top-1/2 before:left-0 before:h-px before:w-4 before:bg-accent after:absolute after:top-0 after:left-1/2 after:h-4 after:w-px after:bg-accent after:transition-transform after:duration-300 group-open:after:scale-y-0"
                  />
                </summary>
                <div className="flex max-w-[64ch] flex-col gap-4 pb-8 text-muted">
                  <Paragraphs text={item.answer} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </Shell>
  );
}

export function ContactSection({ section }: SectionProps<"contact">) {
  const c = section.content;
  return (
    <Shell id={section.id} label={c.heading} band>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
        <div>
          <h2 className="font-display text-headline">{c.heading}</h2>
          {c.body ? (
            <div className="mt-6 flex max-w-[52ch] flex-col gap-4 text-lg text-muted">
              <Paragraphs text={c.body} />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-start justify-end gap-6">
          {c.email ? (
            <a
              href={`mailto:${c.email}`}
              className="font-display text-[clamp(1.4rem,0.9rem+2.2vw,2.6rem)] break-all underline decoration-accent decoration-2 underline-offset-8 hover:text-accent"
            >
              {c.email}
            </a>
          ) : null}
          {c.phone ? (
            <a
              href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
              className="font-label text-2xl hover:text-accent"
            >
              {c.phone}
            </a>
          ) : null}
          {hasLink(c.primary) ? (
            <ButtonLink href={c.primary.href} size="lg">
              {c.primary.label}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
