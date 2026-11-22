import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { createReleaseAsStaff } from "@/modules/music/admin-actions";
import { CreateReleaseForm } from "@/modules/music/components/release-forms";

export const metadata: Metadata = { title: "New release" };

export default function NewStaffReleasePage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New release"
        eyebrow="Music"
        backHref="/admin/music"
        backLabel="Music"
      />
      <p className="mt-4 max-w-2xl text-muted">
        Upload a track, EP, album or bundle for any artist on the roster. Next
        you add artwork, masters and previews, price and genre, then publish it
        straight to the store. Earnings go to the artist&apos;s wallet as usual.
      </p>
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Form />
        </Suspense>
      </div>
    </Container>
  );
}

async function Form() {
  await requirePermission("music.manage", "/admin/music/new");
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id, stage_name")
    .neq("status", "archived")
    .order("stage_name");
  const artists = (data ?? []).map((a) => ({ id: a.id, name: a.stage_name }));
  if (!artists.length) {
    return (
      <p className="text-muted">
        Add an artist first under{" "}
        <Link
          href="/admin/artists/new"
          className="underline underline-offset-4"
        >
          Artists
        </Link>
        .
      </p>
    );
  }
  return <CreateReleaseForm artists={artists} action={createReleaseAsStaff} />;
}
