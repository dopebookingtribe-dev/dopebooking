import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, shortDate } from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Picture } from "@/components/ui/picture";
import { requireUser } from "@/lib/auth/dal";
import { formatCents } from "@/modules/marketplace/schemas";
import { ReleaseStatusBadge } from "@/modules/music/components/music-badges";
import {
  getArtistBalance,
  getMyArtists,
  listMyReleases,
} from "@/modules/music/queries";
import { MUSIC_CURRENCY, RELEASE_TYPES } from "@/modules/music/schemas";

export const metadata: Metadata = { title: "My music" };

export default function MyMusicPage({
  searchParams,
}: PageProps<"/dashboard/music">) {
  return (
    <Container className="py-16">
      <Suspense fallback={<p className="text-muted">Loading your music…</p>}>
        <MyMusic searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function MyMusic({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard/music">["searchParams"];
}) {
  const user = await requireUser("/dashboard/music");
  const [artists, params] = await Promise.all([
    getMyArtists(user.id),
    searchParams,
  ]);

  if (!artists.length) {
    return (
      <>
        <AdminHeader title="Sell your music" eyebrow="My music" />
        <div className="mt-10 max-w-2xl rounded-(--radius) border border-line bg-surface-1 p-8">
          <p className="text-lg">
            Music sales are open to artists on the DopeBooking roster.
          </p>
          <p className="mt-3 text-muted">
            If you&apos;re one of our artists, ask your DopeBooking contact to
            link this account ({user.email ?? "your account"}) to your artist
            profile. You&apos;ll then upload releases here, set prices and
            follow your earnings.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <ButtonLink href="/music" variant="secondary">
              Browse the music store
            </ButtonLink>
            <ButtonLink href="/legal/music-seller-terms" variant="text">
              Music seller terms
            </ButtonLink>
          </div>
        </div>
      </>
    );
  }

  const [releases, balances] = await Promise.all([
    listMyReleases(artists.map((artist) => artist.id)),
    Promise.all(artists.map((artist) => getArtistBalance(artist.id))),
  ]);
  const money = (cents: number) => formatCents(cents, MUSIC_CURRENCY);

  return (
    <>
      <AdminHeader
        title="My music"
        eyebrow={artists.map((artist) => artist.name).join(" · ")}
        action={{ href: "/dashboard/music/new", label: "New release" }}
      />
      {params.deleted ? (
        <p role="status" className="mt-6 text-sm text-success">
          Release deleted.
        </p>
      ) : null}

      {artists.map((artist, index) => {
        const balance = balances[index];
        return (
          <section
            key={artist.id}
            aria-label={`Earnings for ${artist.name}`}
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              ["Available to withdraw", balance.available, "text-accent"],
              ["On hold", balance.pending, ""],
              [
                "Earned in total",
                balance.net_earnings - balance.refunded + balance.adjustments,
                "",
              ],
              ["Paid out", balance.withdrawn, ""],
            ].map(([label, value, tone]) => (
              <div
                key={label as string}
                className="rounded-(--radius) border border-line bg-surface-1 p-5"
              >
                <p className="font-label text-xs text-muted">
                  {artists.length > 1 ? `${artist.name} · ` : ""}
                  {label}
                </p>
                <p className={`mt-2 font-display text-4xl ${tone}`}>
                  {money(value as number)}
                </p>
              </div>
            ))}
            <Link
              href={`/dashboard/music/earnings?artist=${artist.id}`}
              className="text-sm underline underline-offset-4 sm:col-span-2 lg:col-span-4"
            >
              Earnings, sales and payouts →
            </Link>
          </section>
        );
      })}

      <section aria-labelledby="releases-heading" className="mt-16">
        <h2 id="releases-heading" className="font-display text-3xl">
          Releases
        </h2>
        {releases.length ? (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {releases.map((release) => (
              <li key={release.id}>
                <Link
                  href={`/dashboard/music/${release.id}`}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 py-3 hover:bg-surface-1 sm:grid-cols-[3.5rem_minmax(0,1fr)_8rem_6rem_7rem]"
                >
                  <span className="relative size-14 overflow-hidden rounded-lg bg-surface-2">
                    {release.cover ? (
                      <Picture
                        image={release.cover}
                        decorative
                        sizes="3.5rem"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {release.title}
                    </span>
                    <span className="block text-sm text-muted">
                      {RELEASE_TYPES[release.type]}
                      {artists.length > 1
                        ? ` · ${artists.find((a) => a.id === release.artistId)?.name ?? ""}`
                        : ""}
                    </span>
                  </span>
                  <span className="hidden sm:block">
                    <ReleaseStatusBadge status={release.status} />
                  </span>
                  <span className="hidden font-label text-sm sm:block">
                    {release.price !== null ? money(release.price) : "—"}
                  </span>
                  <span className="text-right text-sm text-muted">
                    <span className="sm:hidden">
                      <ReleaseStatusBadge status={release.status} />
                    </span>
                    <span className="hidden sm:inline">
                      {shortDate(release.updatedAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-(--radius) border border-dashed border-line-strong p-8">
            <p>No releases yet.</p>
            <p className="mt-2 text-sm text-muted">
              Create a draft, add artwork and tracks, then send it for review.
              We check every release before it goes live.
            </p>
            <ButtonLink href="/dashboard/music/new" className="mt-6">
              Create your first release
            </ButtonLink>
          </div>
        )}
      </section>
    </>
  );
}
