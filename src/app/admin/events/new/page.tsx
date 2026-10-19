import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { allTimeZones } from "@/lib/datetime";
import { CreateEventForm } from "@/modules/events/components/admin/create-event-form";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New event"
        backHref="/admin/events"
        backLabel="All events"
      />
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Checking access…</p>}>
          <Gate />
        </Suspense>
      </div>
    </Container>
  );
}

async function Gate() {
  await requireRole(STAFF_ROLES, "/admin/events/new");
  return <CreateEventForm timeZones={allTimeZones()} />;
}
