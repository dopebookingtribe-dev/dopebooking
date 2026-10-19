import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { NAV_ITEMS } from "./nav-items";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line py-12">
      <Container className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-3xl">DopeBooking</p>
          <Meta className="mt-3">International psytrance agency · Germany</Meta>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-text">
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
