import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · DopeBooking" },
  robots: { index: false, follow: false },
};

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/artists", label: "Artists" },
] as const;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <div className="border-b border-line bg-surface-1">
        <Container>
          <nav aria-label="Admin">
            <ul className="flex gap-6 overflow-x-auto">
              {ADMIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center font-mono text-xs tracking-[0.18em] text-muted uppercase hover:text-text"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>
      {children}
    </>
  );
}
