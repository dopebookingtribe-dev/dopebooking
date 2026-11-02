import Link from "next/link";

const LINKS = [
  { href: "/admin/music", label: "Releases" },
  { href: "/admin/music/artists", label: "Artists & teams" },
  { href: "/admin/music/genres", label: "Genres" },
  { href: "/admin/music/finance", label: "Finance & payouts" },
] as const;

export function MusicAdminNav({
  current,
}: {
  current: (typeof LINKS)[number]["href"];
}) {
  return (
    <nav aria-label="Music admin" className="mt-8">
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
