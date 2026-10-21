"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import type { CmsLink, SiteSettings } from "@/modules/cms/schema";

export function MobileMenu({
  nav,
  cta,
  accountSlot,
}: {
  nav: SiteSettings["nav"];
  cta: CmsLink;
  accountSlot: React.ReactNode;
}) {
  // No usePathname(): reading the URL here would make every dynamic route
  // block on it. The menu closes when any link inside it is followed.
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center font-label text-sm"
      >
        {open ? "Close" : "Menu"}
      </button>

      <div
        id={panelId}
        hidden={!open}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col overflow-y-auto bg-bg px-(--gutter) pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <nav aria-label="Main">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.href} className="border-b border-line py-2">
                <Link
                  href={item.href}
                  className="block py-2 font-display text-3xl hover:text-accent"
                >
                  {item.label}
                </Link>
                {item.children.length ? (
                  <ul className="mb-2 flex flex-wrap gap-x-5">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className="inline-flex min-h-11 items-center text-muted hover:text-text"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-3 pt-8">
          {accountSlot}
          {cta.label && cta.href ? (
            <Link
              href={cta.href}
              className={buttonClasses("primary", "w-full")}
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
