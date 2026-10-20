import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { ServiceStatusBadge } from "@/modules/services/components/service-status-badge";
import { listMyServiceRequests } from "@/modules/services/queries";
import { SERVICE_LABELS } from "@/modules/services/schemas";
import { formatDay } from "@/modules/workflow/constants";

export const metadata: Metadata = { title: "My service requests" };

export default function MyRequestsPage() {
  return (
    <Container className="py-16">
      <Meta>Dashboard</Meta>
      <h1 className="mt-3 font-display text-headline">Service requests</h1>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const requests = await listMyServiceRequests();
  if (!requests.length) {
    return (
      <div className="mt-10">
        <p className="text-muted">
          No promotion, catering or production requests yet.
        </p>
        <ButtonLink href="/services" className="mt-6">
          See services
        </ButtonLink>
      </div>
    );
  }
  return (
    <ul className="mt-10 divide-y divide-line border-y border-line">
      {requests.map((request) => (
        <li key={request.id}>
          <Link
            href={`/dashboard/requests/${request.id}`}
            className="group grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"
          >
            <div>
              <p className="font-display text-3xl transition-colors group-hover:text-accent">
                {SERVICE_LABELS[request.service_type]}
              </p>
              <p className="mt-1 text-sm text-muted">
                {request.event_name} · {request.city} ·{" "}
                {formatDay(request.event_start)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-muted">
                {request.reference}
              </span>
              <ServiceStatusBadge status={request.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
