import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import {
  cancelMyBooking,
  sendBookingMessage,
} from "@/modules/bookings/actions";
import { BookingSummary } from "@/modules/bookings/components/booking-summary";
import { MessageForm } from "@/modules/workflow/components/message-form";
import { BookingStatusBadge } from "@/modules/bookings/components/status-badge";
import { Timeline } from "@/modules/workflow/components/timeline";
import { getMyBooking } from "@/modules/bookings/queries";
import { BOOKING_WORKFLOW, OPEN_STATUSES } from "@/modules/bookings/schemas";

export const metadata: Metadata = { title: "Booking request" };

type Props = PageProps<"/dashboard/bookings/[id]">;

export default function MyBookingPage({ params, searchParams }: Props) {
  return (
    <Container className="py-12">
      <Link
        href="/dashboard/bookings"
        className="text-sm text-muted hover:text-text"
      >
        ← All requests
      </Link>
      <Suspense fallback={<p className="mt-10 text-muted">Loading request…</p>}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Detail({
  params,
  searchParams,
}: Pick<Props, "params" | "searchParams">) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  const data = await getMyBooking(id);
  if (!data) notFound();
  const { booking, artist, timeline, userId } = data;
  const canCancel = OPEN_STATUSES.includes(booking.status);

  return (
    <>
      {sent ? (
        <p
          role="status"
          className="mt-8 rounded-(--radius) border border-success/40 bg-surface-1 p-4 text-sm"
        >
          Request sent. We&apos;ve emailed you a copy and will reply here —
          usually within 2 working days.
        </p>
      ) : null}
      <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Meta>Booking {booking.reference}</Meta>
          <h1 className="mt-3 font-display text-headline">
            {artist ? (
              <Link
                href={`/artists/${artist.slug}`}
                className="hover:text-accent"
              >
                {artist.name}
              </Link>
            ) : (
              "Artist"
            )}
          </h1>
        </div>
        <BookingStatusBadge status={booking.status} />
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-8">
          <BookingSummary booking={booking} />
          {canCancel ? (
            <form action={cancelMyBooking.bind(null, booking.id)}>
              <ConfirmSubmit
                message="Cancel this booking request? This can't be undone."
                className={buttonClasses(
                  "ghost",
                  "px-0 text-danger hover:text-danger",
                )}
              >
                Cancel request
              </ConfirmSubmit>
            </form>
          ) : null}
        </div>
        <section
          aria-labelledby="conversation-heading"
          className="flex flex-col gap-8"
        >
          <h2 id="conversation-heading" className="font-display text-3xl">
            Conversation
          </h2>
          <Timeline
            items={timeline}
            labels={BOOKING_WORKFLOW.labels}
            nameOf={(by: string | null) =>
              by === userId ? "You" : "DopeBooking team"
            }
          />
          <MessageForm action={sendBookingMessage.bind(null, booking.id)} />
        </section>
      </div>
    </>
  );
}
