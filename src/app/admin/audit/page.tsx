import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { listAuditLog } from "@/modules/admin/queries";

export const metadata: Metadata = { title: "Audit log" };

const TABLES: Record<string, string> = {
  artists: "Artist",
  artist_private: "Artist booking info",
  events: "Event",
  galleries: "Gallery",
  videos: "Video",
  products: "Product",
  product_categories: "Shop category",
  sellers: "Shop",
  media_assets: "Photo",
  site_pages: "Page",
  site_settings: "Site settings",
  user_roles: "User role",
  role_permissions: "Role permission",
};

const ACTIONS = { INSERT: "Created", UPDATE: "Changed", DELETE: "Deleted" };

export default function AuditPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Audit log" />
      <p className="mt-4 max-w-2xl text-muted">
        The latest 200 changes to content, settings and access. Values are not
        stored, only who changed what and which fields.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Log />
      </Suspense>
    </Container>
  );
}

async function Log() {
  await requirePermission("audit.view", "/admin/audit");
  const rows = await listAuditLog();
  if (!rows.length)
    return <p className="mt-10 text-muted">No changes recorded yet.</p>;
  return (
    <div className="mt-10 overflow-x-auto rounded-(--radius) border border-line">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="bg-surface-1 font-label text-xs text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">
              When
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Who
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              What
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Fields
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="px-4 py-3 whitespace-nowrap text-muted">
                {new Date(row.created_at).toLocaleString("en-GB", {
                  timeZone: "Europe/Berlin",
                })}
              </td>
              <td className="px-4 py-3">
                {row.actor_id
                  ? (row.actorName ?? `${row.actor_id.slice(0, 8)}…`)
                  : "System"}
              </td>
              <td className="px-4 py-3">
                {ACTIONS[row.action]} {TABLES[row.table_name] ?? row.table_name}
                {row.record_id ? (
                  <span className="ml-2 font-label text-xs text-muted">
                    {row.record_id.slice(0, 12)}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted">{row.changed.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
