"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { BOOK_CTA, NAV_ITEMS } from "./nav-items";

export function MobileMenu({ accountSlot }: { accountSlot: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const panelId = useId();

  // Close when the route changes.
  if (open && openedAt !== pathname) {
    setOpen(false);
  }

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
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((value) => !value);
        }}
        className="inline-flex min-h-11 min-w-11 items-center justify-center font-mono text-xs tracking-[0.18em] uppercase"
      >
        {open ? "Close" : "Menu"}
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-bg px-(--gutter) pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <nav aria-label="Main">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={
                    pathname.startsWith(item.href) ? "page" : undefined
                  }
                  className="block py-3 font-display text-4xl aria-[current=page]:text-accent"
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
