import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import type { ContentStatus } from "@/lib/supabase/database.types";
import { setArtStatus } from "../../actions";

const LINKS = [
  { href: "/admin/art", label: "Overview" },
  { href: "/admin/art/exhibitions", label: "Exhibitions" },
  { href: "/admin/art/artists", label: "Artists" },
  { href: "/admin/art/artworks", label: "Artworks" },
  { href: "/admin/art/festivals", label: "Festivals" },
  { href: "/admin/art/order", label: "Featured order" },
  { href: "/admin/art/inquiries", label: "Inquiries" },
] as const;

export type ArtAdminHref = (typeof LINKS)[number]["href"];

export function ArtAdminNav({ current }: { current: ArtAdminHref }) {
  return (
    <nav aria-label="Art Gallery admin" className="mt-8">
      <ul className="flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={link.href === current ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-muted hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One-click publish / unpublish / archive. */
export function StatusControls({
  kind,
  id,
  status,
}: {
  kind: "artist" | "exhibition" | "artwork";
  id: string;
  status: ContentStatus;
}) {
  const options: { to: ContentStatus; label: string }[] = [
    status !== "published"
      ? { to: "published", label: "Publish" }
      : { to: "draft", label: "Unpublish" },
    ...(status !== "archived"
      ? [{ to: "archived" as const, label: "Archive" }]
      : []),
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <form
          key={option.to}
          action={setArtStatus.bind(null, kind, id, option.to)}
        >
          <button
            type="submit"
            className={buttonClasses(
              option.to === "published" ? "primary" : "secondary",
              "min-h-10 px-4 text-xs",
            )}
          >
            {option.label}
          </button>
        </form>
      ))}
    </div>
  );
}

export function MigrationNotice() {
  return (
    <div className="mt-10 max-w-2xl rounded-(--radius) border border-uv/60 bg-surface-1 p-6">
      <h2 className="font-display text-2xl">One step left: the database</h2>
      <p className="mt-3 text-muted">
        The Art Gallery tables are not in the database yet. Apply these two
        migrations in order (Supabase SQL editor, or{" "}
        <code className="font-label">npx supabase db push</code>):
      </p>
      <ul className="mt-4 flex flex-col gap-1 font-label text-sm">
        <li>supabase/migrations/20261121000000_art_gallery_enum.sql</li>
        <li>supabase/migrations/20261121000100_art_gallery.sql</li>
      </ul>
      <p className="mt-4 text-sm text-muted">
        Both are additive: no existing data changes. The public Art Gallery
        pages already work and show empty states until then.
      </p>
    </div>
  );
}
