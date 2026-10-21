import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ADMIN_GROUPS, type AdminLink } from "@/components/admin/admin-nav";
import { Container } from "@/components/ui/container";
import { currentPermissions } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | DopeBooking" },
  robots: { index: false, follow: false },
};

function NavList({ links }: { links: AdminLink[] }) {
  return (
    <ul className="flex [scrollbar-width:none] gap-1 overflow-x-auto py-1">
      <li>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm whitespace-nowrap text-muted hover:bg-surface-2 hover:text-text"
        >
          Overview
        </Link>
      </li>
      {links.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm whitespace-nowrap text-muted hover:bg-surface-2 hover:text-text"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function PermittedNav() {
  const permissions = await currentPermissions();
  const links = ADMIN_GROUPS.flatMap((group) => group.links).filter((link) =>
    permissions.has(link.permission),
  );
  return <NavList links={links} />;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <div className="border-b border-line bg-surface-1">
        <Container>
          <nav aria-label="Admin">
            <Suspense fallback={<NavList links={[]} />}>
              <PermittedNav />
            </Suspense>
          </nav>
        </Container>
      </div>
      {children}
    </>
  );
}
