import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { NAV_ITEMS } from "./nav-items";

const MORE_LINKS = [
  { href: "/sell", label: "Sell with us" },
  { href: "/videos", label: "Videos" },
] as const;

const LEGAL_LINKS = [
  { href: "/legal/imprint", label: "Imprint" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/shop-terms", label: "Shop terms" },
  { href: "/legal/seller-terms", label: "Seller terms" },
  { href: "/legal/cookies", label: "Cookies" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line py-12">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-3xl">DopeBooking</p>
            <Meta className="mt-3">
              International psytrance agency, based in Germany
            </Meta>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {[...NAV_ITEMS, ...MORE_LINKS].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center hover:text-text"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <nav aria-label="Legal" className="border-t border-line pt-6">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center hover:text-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  );
}
