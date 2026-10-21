import Link from "next/link";

/** Photos / Videos switch shared by the two media index pages. */
export function MediaTabs({ active }: { active: "photos" | "videos" }) {
  const tabs = [
    { key: "photos", href: "/gallery", label: "Photos" },
    { key: "videos", href: "/videos", label: "Videos" },
  ] as const;
  return (
    <nav aria-label="Media">
      <ul className="flex gap-2">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              aria-current={tab.key === active ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm text-muted transition-colors hover:border-text hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-accent"
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
