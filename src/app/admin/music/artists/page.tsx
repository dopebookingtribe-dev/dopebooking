import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import {
  addArtistMember,
  removeArtistMember,
  setArtistCommission,
} from "@/modules/music/admin-actions";
import {
  getMusicSettings,
  listMusicArtists,
} from "@/modules/music/admin-queries";
import {
  CommissionForm,
  MemberForm,
} from "@/modules/music/components/admin-forms";
import { MusicAdminNav } from "@/modules/music/components/music-admin-nav";

export const metadata: Metadata = { title: "Music artists" };

export default function MusicArtistsPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Artists & teams" eyebrow="Music" />
      <MusicAdminNav current="/admin/music/artists" />
      <p className="mt-6 max-w-2xl text-muted">
        Link an artist&apos;s own account (they sign up first) so they can
        upload and sell music from My music. Managers get the same access.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Artists />
      </Suspense>
    </Container>
  );
}

async function Artists() {
  const { permissions } = await requirePermission(
    "music.manage",
    "/admin/music/artists",
  );
  const finance = permissions.has("finance.manage");
  const [artists, settings] = await Promise.all([
    listMusicArtists(),
    getMusicSettings(),
  ]);
  if (!artists.length)
    return <p className="mt-10 text-muted">No artists yet.</p>;
  return (
    <ul className="mt-10 flex flex-col gap-6">
      {artists.map((artist) => (
        <li
          key={artist.id}
          className="rounded-(--radius) border border-line p-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl">
              <Link
                href={`/admin/artists/${artist.id}`}
                className="hover:text-accent"
              >
                {artist.stage_name}
              </Link>
            </h2>
            <p className="text-sm text-muted">
              {artist.releases} releases · {artist.live} live
              {artist.status !== "published" ? " · profile not public" : ""}
            </p>
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-medium">Team</h3>
              {artist.members.length ? (
                <ul className="flex flex-col gap-2 text-sm">
                  {artist.members.map((member) => (
                    <li
                      key={member.userId}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <span>
                        {member.name ?? member.email ?? "Account"}
                        {member.email && member.name ? (
                          <span className="text-muted"> · {member.email}</span>
                        ) : null}
                        <span className="text-muted">
                          {" "}
                          · {member.role === "owner" ? "artist" : "manager"}
                        </span>
                      </span>
                      <form
                        action={removeArtistMember.bind(
                          null,
                          artist.id,
                          member.userId,
                        )}
                      >
                        <ConfirmSubmit
                          message="Remove this account from the artist? They lose access to the music dashboard."
                          className="text-sm text-danger underline-offset-4 hover:underline"
                        >
                          Remove
                        </ConfirmSubmit>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No linked accounts.</p>
              )}
              <MemberForm action={addArtistMember.bind(null, artist.id)} />
            </div>
            {finance ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium">Music commission</h3>
                <p className="text-sm text-muted">
                  Leave empty for the default ({settings.commission_bps / 100}{" "}
                  %). Applies to new sales only.
                </p>
                <CommissionForm
                  action={setArtistCommission.bind(null, artist.id)}
                  bps={artist.commissionBps}
                  defaultBps={settings.commission_bps}
                />
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
