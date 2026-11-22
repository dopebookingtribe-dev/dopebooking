import Link from "next/link";
import { Suspense } from "react";
import { ADMIN_GROUPS, canSee } from "@/components/admin/admin-nav";
import { Container } from "@/components/ui/container";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { getPermissions } from "@/lib/auth/permissions";
import { AUDIT_ACTIONS, AUDIT_TABLES } from "@/modules/admin/audit-labels";
import {
  getDashboard,
  quickActions,
  type DashboardStat,
} from "@/modules/admin/dashboard";
import { ROLE_LABELS } from "@/modules/admin/roles";

export default function AdminPage() {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Checking access…</p>}>
        <AdminHome />
      </Suspense>
    </Container>
  );
}

function StatGrid({ stats }: { stats: DashboardStat[] }) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat) => (
        <li key={stat.label}>
          <Link
            href={stat.href}
            className={`block h-full rounded-(--radius) border p-4 transition-colors hover:border-accent ${
              stat.attention
                ? "border-accent/60 bg-accent/5"
                : "border-line bg-surface-1"
            }`}
          >
            <span
              className={`block font-display text-4xl leading-none ${stat.attention ? "text-accent" : ""}`}
            >
              {stat.value}
            </span>
            <span className="mt-2 block text-sm">{stat.label}</span>
            {stat.note ? (
              <span className="block font-label text-xs text-muted">
                {stat.note}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function AdminHome() {
  // Non-staff users get a 404, so the admin area isn't advertised.
  const user = await requireRole(STAFF_ROLES, "/admin");
  const permissions = await getPermissions(user);
  const { attention, content, activity } = await getDashboard(permissions);
  const actions = quickActions(permissions);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-headline">Control room</h1>
          <p className="mt-3 text-sm text-muted">
            Signed in as {user.email} (
            {user.roles.map((role) => ROLE_LABELS[role] ?? role).join(", ")}).
          </p>
        </div>
      </div>

      {actions.length ? (
        <section aria-labelledby="quick" className="mt-10">
          <h2 id="quick" className="font-label text-sm text-accent">
            Quick actions
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm transition-colors hover:border-accent hover:text-accent"
                >
                  + {action.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {attention.length ? (
        <section aria-labelledby="attention" className="mt-10">
          <h2 id="attention" className="font-label text-sm text-accent">
            Waiting for you
          </h2>
          <StatGrid stats={attention} />
        </section>
      ) : null}

      {content.length ? (
        <section aria-labelledby="content" className="mt-10">
          <h2 id="content" className="font-label text-sm text-accent">
            On the website
          </h2>
          <StatGrid stats={content} />
        </section>
      ) : null}

      <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-10">
          {ADMIN_GROUPS.map((group) => {
            const links = group.links.filter((link) =>
              canSee(link, permissions),
            );
            if (!links.length) return null;
            return (
              <section
                key={group.title}
                aria-labelledby={`group-${group.title}`}
              >
                <h2
                  id={`group-${group.title}`}
                  className="font-label text-sm text-accent"
                >
                  {group.title}
                </h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group block h-full rounded-(--radius) border border-line bg-surface-1 p-4 transition-colors hover:border-accent"
                      >
                        <span className="font-display text-xl transition-colors group-hover:text-accent">
                          {link.label}
                        </span>
                        <span className="mt-1 block text-sm text-muted">
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

        {permissions.has("audit.view") ? (
          <section aria-labelledby="activity">
            <div className="flex items-baseline justify-between">
              <h2 id="activity" className="font-label text-sm text-accent">
                Recent activity
              </h2>
              <Link
                href="/admin/audit"
                className="text-sm text-muted underline-offset-4 hover:text-text hover:underline"
              >
                Audit log
              </Link>
            </div>
            {activity.length ? (
              <ol className="mt-3 divide-y divide-line rounded-(--radius) border border-line">
                {activity.map((row) => (
                  <li key={row.id} className="px-4 py-3 text-sm">
                    <span className="block">
                      {AUDIT_ACTIONS[row.action]}{" "}
                      {AUDIT_TABLES[row.table_name] ?? row.table_name}
                    </span>
                    <span className="block font-label text-xs text-muted">
                      {row.actor_id
                        ? (row.actorName ?? "Staff member")
                        : "System"}{" "}
                      ·{" "}
                      {new Date(row.created_at).toLocaleString("en-GB", {
                        timeZone: "Europe/Berlin",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-muted">No changes yet.</p>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}
