"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export type SidebarGroup = {
  title: string;
  links: { href: string; label: string }[];
};

/** The most specific link that contains the current path wins. */
function activeHref(pathname: string, groups: SidebarGroup[]) {
  const hrefs = [
    "/admin",
    ...groups.flatMap((g) => g.links.map((l) => l.href)),
  ];
  return hrefs
    .filter((href) =>
      href === "/admin"
        ? pathname === "/admin"
        : pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((a, b) => b.length - a.length)[0];
}

function Links({
  groups,
  current,
  onNavigate,
}: {
  groups: SidebarGroup[];
  current: string | undefined;
  onNavigate?: () => void;
}) {
  const item = (href: string, label: string) => {
    const active = href === current;
    return (
      <li key={href}>
        <Link
          href={href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-10 items-center rounded-lg px-3 text-sm transition-colors ${
            active
              ? "bg-surface-2 font-medium text-text shadow-[inset_2px_0_0_var(--accent)]"
              : "text-muted hover:bg-surface-2/60 hover:text-text"
          }`}
        >
          {label}
        </Link>
      </li>
    );
  };
  return (
    <div className="flex flex-col gap-6">
      <ul>{item("/admin", "Overview")}</ul>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 font-label text-xs tracking-wide text-accent">
            {group.title}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {group.links.map((link) => item(link.href, link.label))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Grouped admin navigation: a sticky sidebar on large screens, a disclosure
 * menu on phones and tablets. Links are filtered by permission on the server.
 */
export function AdminSidebar({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname();
  const current = activeHref(pathname, groups);
  const details = useRef<HTMLDetailsElement>(null);
  const currentLabel =
    groups.flatMap((g) => g.links).find((l) => l.href === current)?.label ??
    "Overview";

  // Close the phone menu after navigating.
  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [pathname]);

  return (
    <>
      <details
        ref={details}
        className="group border-b border-line bg-surface-1 lg:hidden"
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-(--gutter) text-sm [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-muted">Admin · </span>
            <span className="font-medium">{currentLabel}</span>
          </span>
          <span aria-hidden className="text-muted group-open:rotate-180">
            ▾
          </span>
        </summary>
        <nav
          aria-label="Admin"
          className="max-h-[70vh] overflow-y-auto px-(--gutter) pt-2 pb-6"
        >
          <Links groups={groups} current={current} />
        </nav>
      </details>
      <aside className="hidden border-r border-line bg-surface-1/60 lg:block">
        <nav
          aria-label="Admin"
          className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto px-3 py-8"
        >
          <Links groups={groups} current={current} />
          <p className="mt-8 border-t border-line px-3 pt-6">
            <Link
              href="/"
              className="text-sm text-muted underline-offset-4 hover:text-text hover:underline"
            >
              View the website ↗
            </Link>
          </p>
        </nav>
      </aside>
    </>
  );
}
