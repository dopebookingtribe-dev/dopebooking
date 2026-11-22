import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import {
  AUDIT_ACTIONS,
  AUDIT_TABLES,
  type AuditAction,
} from "@/modules/admin/audit-labels";
import { listAuditLog } from "@/modules/admin/queries";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f-]{36}$/i;

export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <Container className="py-12">
      <AdminHeader title="Audit log" />
      <p className="mt-4 max-w-2xl text-muted">
        Every change to content, media, settings and access. Values are not
        stored, only who changed what and which fields.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Log searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Log({
  searchParams,
}: {
  searchParams: PageProps<"/admin/audit">["searchParams"];
}) {
  await requirePermission("audit.view", "/admin/audit");
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const table = one("table") in AUDIT_TABLES ? one("table") : "";
  const action =
    one("action") in AUDIT_ACTIONS ? (one("action") as AuditAction) : undefined;
  const actor = UUID.test(one("actor")) ? one("actor") : "";
  const page = Math.max(1, Number.parseInt(one("page"), 10) || 1);

  // One extra row tells whether there is a next page.
  const rows = await listAuditLog(PAGE_SIZE + 1, {
    table: table || undefined,
    action,
    actor: actor || undefined,
    page,
  });
  const shown = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;
  const link = (next: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    const merged = { table, action, actor, page, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "page" && value === 1))
        query.set(key, String(value));
    }
    const text = query.toString();
    return text ? `/admin/audit?${text}` : "/admin/audit";
  };

  return (
    <>
      <form
        method="get"
        className="mt-8 flex flex-wrap items-end gap-3 rounded-(--radius) border border-line bg-surface-1 p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">What</span>
          <select
            name="table"
            defaultValue={table}
            className="min-h-11 rounded-lg border border-line-strong bg-bg px-3"
          >
            <option value="">Everything</option>
            {Object.entries(AUDIT_TABLES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Change</span>
          <select
            name="action"
            defaultValue={action ?? ""}
            className="min-h-11 rounded-lg border border-line-strong bg-bg px-3"
          >
            <option value="">Any</option>
            {Object.entries(AUDIT_ACTIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {actor ? <input type="hidden" name="actor" value={actor} /> : null}
        <button
          type="submit"
          className="min-h-11 rounded-full border border-line-strong px-5 text-sm hover:border-accent hover:text-accent"
        >
          Filter
        </button>
        {table || action || actor ? (
          <Link
            href="/admin/audit"
            className="min-h-11 content-center text-sm text-muted underline"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      {!shown.length ? (
        <p className="mt-10 text-muted">No changes match.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-(--radius) border border-line">
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
              {shown.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {new Date(row.created_at).toLocaleString("en-GB", {
                      timeZone: "Europe/Berlin",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {row.actor_id ? (
                      <Link
                        href={link({ actor: row.actor_id, page: 1 })}
                        className="underline-offset-4 hover:underline"
                        title="Show only this person's changes"
                      >
                        {row.actorName ?? `${row.actor_id.slice(0, 8)}…`}
                      </Link>
                    ) : (
                      "System"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {AUDIT_ACTIONS[row.action]}{" "}
                    {AUDIT_TABLES[row.table_name] ?? row.table_name}
                    {row.record_id ? (
                      <span className="ml-2 font-label text-xs text-muted">
                        {row.record_id.slice(0, 12)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.changed.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav aria-label="Pages" className="mt-6 flex items-center gap-4 text-sm">
        {page > 1 ? (
          <Link
            href={link({ page: page - 1 })}
            className="underline underline-offset-4"
          >
            ← Newer
          </Link>
        ) : null}
        <span className="text-muted">Page {page}</span>
        {hasNext ? (
          <Link
            href={link({ page: page + 1 })}
            className="underline underline-offset-4"
          >
            Older →
          </Link>
        ) : null}
      </nav>
    </>
  );
}
