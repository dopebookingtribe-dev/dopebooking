import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { getCurrentUser } from "@/lib/auth/dal";
import { COUNTRIES } from "@/lib/countries";
import { getPublishedArtist } from "@/modules/artists/queries";
import { createBookingRequest } from "@/modules/bookings/actions";
import { BookingRequestForm } from "@/modules/bookings/components/booking-request-form";

type Props = PageProps<"/book/[slug]">;

export const metadata: Metadata = {
  title: "Request a booking",
  robots: { index: false },
};

export default function BookArtistPage({ params }: Props) {
  return (
    <Container className="py-16">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Booking params={params} />
      </Suspense>
    </Container>
  );
}

async function Booking({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const artist = await getPublishedArtist(slug);
  if (!artist) notFound();
  const user = await getCurrentUser();

  return (
    <div className="grid gap-12 lg:grid-cols-[18rem_1fr] lg:gap-16">
      <aside className="flex items-center gap-4 lg:flex-col lg:items-start">
        <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-(--radius) bg-surface-2 lg:w-full">
          {artist.portrait ? (
            <Image
              src={artist.portrait.url}
              alt=""
              fill
              sizes="(min-width: 1024px) 18rem, 6rem"
              className="object-cover"
            />
          ) : null}
        </div>
        <div>
          <Meta>Booking request</Meta>
          <p className="mt-2 font-display text-4xl">{artist.stageName}</p>
          <Link
            href={`/artists/${artist.slug}`}
            className="mt-2 inline-block text-sm text-muted hover:text-text"
          >
            ← Back to profile
          </Link>
        </div>
      </aside>

      <div>
        <h1 className="font-display text-headline">
          Request {artist.stageName}
        </h1>
        {user ? (
          <div className="mt-10">
            <BookingRequestForm
              artistName={artist.stageName}
              countries={COUNTRIES}
              action={createBookingRequest.bind(null, artist.id, artist.slug)}
            />
          </div>
        ) : (
          <div className="mt-8 max-w-lg">
            <p className="text-lg text-muted">
              Create a free account or sign in to send a booking request.
              You&apos;ll be able to follow its status and talk to our booking
              team in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink
                href={`/signup?next=${encodeURIComponent(`/book/${artist.slug}`)}`}
              >
                Create account
              </ButtonLink>
              <ButtonLink
                href={`/login?next=${encodeURIComponent(`/book/${artist.slug}`)}`}
                variant="secondary"
              >
                Sign in
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
