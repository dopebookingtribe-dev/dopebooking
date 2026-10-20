import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · DopeBooking" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/bookings", label: "Bookings" },
  { href: "/dashboard/requests", label: "Services" },
  { href: "/dashboard/notifications", label: "Notifications" },
] as const;

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <>
      <div className="border-b border-line bg-surface-1">
        <Container>
          <nav aria-label="Dashboard">
            <ul className="flex gap-6 overflow-x-auto">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center font-mono text-xs tracking-[0.18em] whitespace-nowrap text-muted uppercase hover:text-text"
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
