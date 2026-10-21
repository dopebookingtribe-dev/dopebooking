import Link from "next/link";
import { Suspense } from "react";
import { buttonClasses } from "@/components/ui/button";
import { CartLink } from "@/modules/marketplace/components/cart-link";
import { getSiteSettings } from "@/modules/cms/queries";
import { AccountLink, SignInLink } from "./account-link";
import { MobileMenu } from "./mobile-menu";

function Account() {
  return (
    <Suspense fallback={<SignInLink />}>
      <AccountLink />
    </Suspense>
  );
}

export async function SiteHeader() {
  const settings = await getSiteSettings();
  const { nav, cta, brand } = settings;

  return (
    <header className="sticky top-0 z-50 border-b border-line">
      {/* Blur lives on its own layer: backdrop-filter on the header itself
          would trap the fixed-position mobile menu inside the header box. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-bg/85 backdrop-blur-md"
      />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-(--gutter)">
        <Link href="/" className="font-display text-xl leading-none">
          {brand.name}
        </Link>

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted transition-colors hover:text-text"
                >
                  {item.label}
                  {item.children.length ? (
                    <svg
                      aria-hidden
                      viewBox="0 0 10 6"
                      className="size-2.5 transition-transform duration-200 group-focus-within:rotate-180 group-hover:rotate-180"
                    >
                      <path
                        d="M1 1l4 4 4-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  ) : null}
                </Link>
                {item.children.length ? (
                  <div className="pointer-events-none absolute top-full left-1/2 w-72 -translate-x-1/2 translate-y-1 pt-2 opacity-0 transition duration-200 ease-(--ease-out) group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                    <ul className="overflow-hidden rounded-(--radius) border border-line bg-surface-1 p-2 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.8)]">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="block rounded-(--radius) px-3 py-2.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
                          >
                            <span className="block text-sm font-semibold">
                              {child.label}
                            </span>
                            {child.description ? (
                              <span className="block text-sm text-muted">
                                {child.description}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-5 whitespace-nowrap xl:flex">
          <CartLink />
          <Account />
          {cta.label && cta.href ? (
            <Link href={cta.href} className={buttonClasses("primary")}>
              {cta.label}
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-4 xl:hidden">
          <CartLink />
          <MobileMenu nav={nav} cta={cta} accountSlot={<Account />} />
        </div>
      </div>
    </header>
  );
}
