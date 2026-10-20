"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { BOOK_CTA, NAV_ITEMS } from "./nav-items";

export function MobileMenu({ accountSlot }: { accountSlot: React.ReactNode }) {
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
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center font-label text-xs"
      >
        {open ? "Close" : "Menu"}
      </button>

      <div
        id={panelId}
        hidden={!open}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-bg px-(--gutter) pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <nav aria-label="Main">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block py-3 font-display text-4xl hover:text-accent"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          {accountSlot}
          <Link
            href={BOOK_CTA.href}
            className={buttonClasses("primary", "w-full")}
          >
            {BOOK_CTA.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
