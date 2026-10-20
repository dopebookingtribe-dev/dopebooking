import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, AdminTable } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { ServiceStatusBadge } from "@/modules/services/components/service-status-badge";
import { listServiceRequestsForAdmin } from "@/modules/services/queries";
import { SERVICE_LABELS } from "@/modules/services/schemas";
import { formatDay } from "@/modules/workflow/constants";

export const metadata: Metadata = { title: "Service requests" };

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

export default function AdminServicesPage({
  searchParams,
}: PageProps<"/admin/services">) {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Service requests"
        action={{ href: "/admin/providers", label: "Providers" }}
      />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Inbox searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Inbox({
  searchParams,
}: {
  searchParams: PageProps<"/admin/services">["searchParams"];
}) {
  const raw = (await searchParams).status;
  const filter: Filter = FILTERS.some((item) => item.key === raw)
    ? (raw as Filter)
    : "open";
  const requests = await listServiceRequestsForAdmin(filter);

  return (
    <>
      <nav aria-label="Filter requests" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <li key={item.key}>
              <Link
                href={`/admin/services?status=${item.key}`}
                aria-current={filter === item.key ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-muted hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <AdminTable
        columns={["Request", "Status", "Service", "Starts", "Place"]}
        empty="No requests here."
        rows={requests.map((request) => ({
          key: request.id,
          href: `/admin/services/${request.id}`,
          cells: [
            <>
              {request.event_name}
              <span className="ml-2 font-label text-xs text-muted">
                {request.reference}
              </span>
              {!request.assigned_staff_id ? (
                <span className="ml-2 text-xs text-uv">Unassigned</span>
              ) : null}
            </>,
            <ServiceStatusBadge key="status" status={request.status} />,
            SERVICE_LABELS[request.service_type],
            formatDay(request.event_start),
            `${request.city}, ${request.country}`,
          ],
        }))}
      />
    </>
  );
}
