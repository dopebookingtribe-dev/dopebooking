import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader, EditSection } from "@/components/admin/admin-ui";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import {
  assignBooking,
  changeBookingStatus,
  sendBookingMessage,
} from "@/modules/bookings/actions";
import {
  BookingSummary,
  formatMoney,
} from "@/modules/bookings/components/booking-summary";
import { MessageForm } from "@/modules/bookings/components/message-form";
import { StatusActions } from "@/modules/bookings/components/status-actions";
import { BookingStatusBadge } from "@/modules/bookings/components/status-badge";
import { Timeline } from "@/modules/bookings/components/timeline";
import { getBookingForAdmin } from "@/modules/bookings/queries";
import { STAFF_TRANSITIONS } from "@/modules/bookings/schemas";

export const metadata: Metadata = { title: "Booking" };

export default function AdminBookingPage({
  params,
}: PageProps<"/admin/bookings/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading booking…</p>}>
        <Detail params={params} />
      </Suspense>
    </Container>
  );
}

async function Detail({
  params,
}: {
  params: PageProps<"/admin/bookings/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getBookingForAdmin(id);
  if (!data) notFound();
  const { booking, artist, fees, timeline, names, userId } = data;
  const nameOf = (person: string | null) =>
    person ? (names.get(person) ?? "Unknown") : "System";
  const assignedToMe = booking.assigned_staff_id === userId;

  return (
    <>
      <AdminHeader
        title={booking.event_name}
        eyebrow={`Booking ${booking.reference}`}
        backHref="/admin/bookings"
        backLabel="All bookings"
      >
        <BookingStatusBadge status={booking.status} />
      </AdminHeader>

      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Request"
          description={`From ${nameOf(booking.requester_id)} on ${new Date(booking.created_at).toLocaleDateString("en-GB")}.`}
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <BookingSummary booking={booking} showPrivate />
            <div className="flex flex-col gap-6">
              <div>
                <Meta>Artist</Meta>
                <p className="mt-2 font-display text-3xl">
                  {artist ? (
                    <Link
                      href={`/artists/${artist.slug}`}
                      className="hover:text-accent"
                    >
                      {artist.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </p>
                {fees && (fees.fee_min !== null || fees.fee_max !== null) ? (
                  <p className="mt-1 text-sm text-muted">
                    Usual fee:{" "}
                    {formatMoney(fees.fee_min, fees.fee_currency) ?? "?"} –{" "}
                    {formatMoney(fees.fee_max, fees.fee_currency) ?? "?"}{" "}
                    (private)
                  </p>
                ) : null}
              </div>
              <div>
                <Meta>Assigned to</Meta>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span>
                    {booking.assigned_staff_id
                      ? nameOf(booking.assigned_staff_id)
                      : "Nobody yet"}
                  </span>
                  <form
                    action={assignBooking.bind(
                      null,
                      booking.id,
                      assignedToMe ? null : userId,
                    )}
                  >
                    <button
                      type="submit"
                      className={buttonClasses(
                        "secondary",
                        "min-h-9 px-3 text-xs",
                      )}
                    >
                      {assignedToMe ? "Unassign me" : "Assign to me"}
                    </button>
                  </form>
                </div>
                <p className="mt-2 text-xs text-muted">
                  The assignee gets the emails for this booking; otherwise all
                  staff do.
                </p>
              </div>
            </div>
          </div>
        </EditSection>

        <EditSection
          title="Status"
          description="Every step is logged and the requester is notified by email."
        >
          <StatusActions
            // Remount when the status changes so the form resets.
            key={booking.status}
            allowed={STAFF_TRANSITIONS[booking.status]}
            defaultCurrency={booking.budget_currency}
            action={changeBookingStatus.bind(null, booking.id)}
          />
        </EditSection>

        <EditSection
          title="Conversation"
          description="Messages are emailed to the requester. Internal notes are staff-only."
        >
          <div className="flex flex-col gap-8">
            <Timeline items={timeline} nameOf={nameOf} />
            <MessageForm
              action={sendBookingMessage.bind(null, booking.id)}
              allowInternal
            />
          </div>
        </EditSection>
      </div>
    </>
  );
}
