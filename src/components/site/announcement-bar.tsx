import Link from "next/link";
import { getSiteSettings } from "@/modules/cms/queries";

const TONES = {
  accent: "bg-accent text-accent-ink",
  uv: "bg-uv text-bg",
  quiet: "bg-surface-2 text-text",
} as const;

/** Site-wide banner from Site settings → Announcement banner. */
export async function AnnouncementBar() {
  const { announcement } = await getSiteSettings();
  if (!announcement.enabled || !announcement.text) return null;
  const { link } = announcement;
  const hasLink = Boolean(link.label && link.href);
  const external = /^https:/.test(link.href);
  return (
    <aside
      aria-label="Announcement"
      className={`relative z-[51] ${TONES[announcement.tone]}`}
    >
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-(--gutter) py-2 text-center text-sm font-medium">
        <span>{announcement.text}</span>
        {hasLink ? (
          external ? (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {link.label}
            </a>
          ) : (
            <Link href={link.href} className="underline underline-offset-4">
              {link.label}
            </Link>
          )
        ) : null}
      </p>
    </aside>
  );
}
