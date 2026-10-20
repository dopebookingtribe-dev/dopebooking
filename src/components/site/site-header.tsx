import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { CartLink } from "@/modules/marketplace/components/cart-link";
import { AccountLink, SignInLink } from "./account-link";
import { MobileMenu } from "./mobile-menu";
import { BOOK_CTA, NAV_ITEMS } from "./nav-items";

function Account() {
  return (
    <Suspense fallback={<SignInLink />}>
      <AccountLink />
    </Suspense>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line">
      {/* Blur lives on its own layer: backdrop-filter on the header itself
          would trap the fixed-position mobile menu inside the header box. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-bg/90 backdrop-blur-md"
      />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-(--gutter)">
        <Link href="/" className="font-display text-xl leading-none">
          DopeBooking
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted transition-colors hover:text-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          <CartLink />
          <Account />
          <Link href={BOOK_CTA.href} className={buttonClasses("primary")}>
            {BOOK_CTA.label}
          </Link>
        </div>

        <div className="flex items-center gap-4 md:hidden">
          <CartLink />
          <MobileMenu accountSlot={<Account />} />
        </div>
      </div>
    </header>
  );
}
