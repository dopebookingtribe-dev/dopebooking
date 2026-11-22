import type { Metadata } from "next";
import { Suspense } from "react";
import { ADMIN_GROUPS, canSee } from "@/components/admin/admin-nav";
import {
  AdminSidebar,
  type SidebarGroup,
} from "@/components/admin/admin-sidebar";
import { currentPermissions } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | DopeBooking" },
  robots: { index: false, follow: false },
};

async function PermittedSidebar() {
  const permissions = await currentPermissions();
  const groups: SidebarGroup[] = ADMIN_GROUPS.map((group) => ({
    title: group.title,
    links: group.links
      .filter((link) => canSee(link, permissions))
      .map(({ href, label }) => ({ href, label })),
  })).filter((group) => group.links.length);
  return <AdminSidebar groups={groups} />;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <Suspense
        fallback={
          // No hooks here: the fallback is prerendered.
          <aside
            aria-hidden
            className="hidden border-r border-line bg-surface-1/60 lg:block"
          />
        }
      >
        <PermittedSidebar />
      </Suspense>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
