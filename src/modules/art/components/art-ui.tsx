import type { CSSProperties, ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { countryName } from "@/lib/countries";
import { TIMING_LABELS, type Timing } from "../schemas";

/*
 * The Art Gallery's own small vocabulary, on top of the site's tokens:
 * - the arch (a gallery niche) frames people,
 * - the wall label (title in a serif italic, then maker, year, medium)
 *   accompanies every artwork, as in a museum,
 * - an exhibition's accent colour draws thin threads, never text.
 */

export type CmsLinkLike = { label: string; href: string };

const hasLink = (link?: CmsLinkLike) =>
  !!link && link.label !== "" && link.href !== "";

export function ArtShell({
  id,
  label,
  band = false,
  className = "",
  children,
}: {
  id?: string;
  label: string;
  band?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className={`scroll-mt-20 py-20 sm:py-28 ${band ? "bg-surface-1" : ""} ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}

/** Section heading with a hairline and an optional index number. */
export function ArtHeader({
  heading,
  body,
  link,
  index,
  as: Tag = "h2",
  id,
}: {
  heading: string;
  body?: string;
  link?: CmsLinkLike;
  index?: string;
  as?: "h2" | "h3";
  id?: string;
}) {
  if (!heading && !body && !hasLink(link)) return null;
  return (
    <div className="mb-12 grid gap-6 border-t border-line pt-6 sm:mb-14 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="max-w-3xl">
        {index ? (
          <p aria-hidden className="mb-4 font-label text-sm text-accent">
            {index}
          </p>
        ) : null}
        {heading ? (
          <Tag id={id} className="font-display text-headline text-balance">
            {heading}
          </Tag>
        ) : null}
        {body ? (
          <p className="mt-5 max-w-[60ch] text-lg text-muted">{body}</p>
        ) : null}
      </div>
      {link && hasLink(link) ? (
        <ButtonLink
          href={link.href}
          variant="text"
          className="justify-self-start"
        >
          {link.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

/** "Now on view" (with a soft pulse), "Upcoming" or "Archive". */
export function TimingBadge({
  timing,
  className = "",
}: {
  timing: Timing;
  className?: string;
}) {
  const tone =
    timing === "current"
      ? "border-success/60 text-success"
      : timing === "upcoming"
        ? "border-accent/60 text-accent"
        : "border-line-strong text-text/80";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border bg-bg/70 px-3 py-1 font-label text-xs backdrop-blur-sm ${tone} ${className}`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full bg-current ${timing === "current" ? "art-pulse" : ""}`}
      />
      {TIMING_LABELS[timing]}
    </span>
  );
}

/** Thin decorative thread in the exhibition's colour (or saffron). */
export function AccentThread({
  color,
  className = "",
  vertical = false,
}: {
  color?: string | null;
  className?: string;
  vertical?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{ "--thread": color ?? "var(--accent)" } as CSSProperties}
      className={`block bg-(--thread) ${vertical ? "w-px" : "h-px"} ${className}`}
    />
  );
}

export function placeLabel(item: {
  venueName?: string | null;
  city: string | null;
  country: string | null;
}) {
  return [item.venueName, item.city, countryName(item.country)]
    .filter(Boolean)
    .join(", ");
}

/** Plain text with blank lines between paragraphs. Never HTML. */
export function ArtParagraphs({
  text,
  className = "",
}: {
  text: string | null;
  className?: string;
}) {
  if (!text) return null;
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part, index) => (
          <p key={index} className={`whitespace-pre-line ${className}`}>
            {part}
          </p>
        ))}
    </>
  );
}

/** Escaped JSON-LD (a "<" in content can't close the script tag). */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export const siteUrl = (path: string) =>
  new URL(
    path,
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ).toString();

export function EmptyArt({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-(--radius) border border-dashed border-line-strong px-6 py-14 text-center sm:px-10">
      <p className="font-display text-3xl">{title}</p>
      <p className="mx-auto mt-3 max-w-[48ch] text-muted">{body}</p>
    </div>
  );
}
