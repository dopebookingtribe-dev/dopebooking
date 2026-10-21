import Link from "next/link";
import { Suspense } from "react";
import { ADMIN_GROUPS } from "@/components/admin/admin-nav";
import { Container } from "@/components/ui/container";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { getPermissions } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/modules/admin/roles";

export default function AdminPage() {
  return (
    <Container className="py-16">
      <Suspense fallback={<p className="text-muted">Checking access…</p>}>
        <AdminHome />
      </Suspense>
    </Container>
  );
}

async function AdminHome() {
  // Non-staff users get a 404, so the admin area isn't advertised.
  const user = await requireRole(STAFF_ROLES, "/admin");
  const permissions = await getPermissions(user);

  return (
    <>
      <h1 className="font-display text-headline">Control room</h1>
      <p className="mt-4 text-muted">
        Signed in as {user.email} (
        {user.roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}).
      </p>
      <div className="mt-12 flex flex-col gap-12">
        {ADMIN_GROUPS.map((group) => {
          const links = group.links.filter((link) =>
            permissions.has(link.permission),
          );
          if (!links.length) return null;
          return (
            <section key={group.title} aria-labelledby={`group-${group.title}`}>
              <h2
                id={`group-${group.title}`}
                className="font-label text-sm text-accent"
              >
                {group.title}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group block h-full rounded-(--radius) border border-line bg-surface-1 p-5 transition-colors hover:border-accent"
                    >
                      <span className="font-display text-xl transition-colors group-hover:text-accent">
                        {link.label}
                      </span>
                      <span className="mt-2 block text-sm text-muted">
                        {link.body}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
