import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/dal";
import { MusicDownloads } from "@/modules/music/components/downloads";
import { getLibrary } from "@/modules/music/queries";

export const metadata: Metadata = { title: "Music library" };

export default function LibraryPage() {
  return (
    <Container className="py-12">
      <AdminHeader title="Music library" eyebrow="Your purchases" />
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Loading your music…</p>}>
          <Library />
        </Suspense>
      </div>
    </Container>
  );
}

async function Library() {
  const user = await requireUser("/dashboard/library");
  const releases = await getLibrary({ userId: user.id });
  if (!releases.length) {
    return (
      <div>
        <p className="text-muted">
          Music you buy shows up here, ready to download any time.
        </p>
        <ButtonLink href="/music" className="mt-6">
          Browse music
        </ButtonLink>
      </div>
    );
  }
  return (
    <>
      <MusicDownloads releases={releases} />
      <p className="mt-6 text-sm text-muted">
        For your personal use, as in the{" "}
        <a href="/legal/music-license" className="underline underline-offset-4">
          music licence
        </a>
        . Each click makes a fresh, short-lived download link.
      </p>
    </>
  );
}
