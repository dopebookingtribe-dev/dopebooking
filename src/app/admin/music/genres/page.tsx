import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { deleteGenre, saveGenre } from "@/modules/music/admin-actions";
import { listGenresForAdmin } from "@/modules/music/admin-queries";
import { GenreForm } from "@/modules/music/components/admin-forms";
import { MusicAdminNav } from "@/modules/music/components/music-admin-nav";

export const metadata: Metadata = { title: "Music genres" };

export default function GenresPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Genres" eyebrow="Music" />
      <MusicAdminNav current="/admin/music/genres" />
      <p className="mt-6 max-w-2xl text-muted">
        Top-level genres group the store; styles sit inside them. Hidden genres
        disappear from filters but releases keep them.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Genres />
      </Suspense>
    </Container>
  );
}

async function Genres() {
  await requirePermission("music.manage", "/admin/music/genres");
  const genres = await listGenresForAdmin();
  const parents = genres.filter((genre) => !genre.parent_id);
  const ordered = parents.flatMap((parent) => [
    parent,
    ...genres.filter((genre) => genre.parent_id === parent.id),
  ]);
  return (
    <div className="mt-10 flex flex-col gap-10">
      <section
        aria-labelledby="add-genre"
        className="rounded-(--radius) border border-line bg-surface-1 p-5"
      >
        <h2 id="add-genre" className="font-display text-2xl">
          Add a genre
        </h2>
        <div className="mt-4">
          <GenreForm action={saveGenre.bind(null, null)} parents={parents} />
        </div>
      </section>
      <ul className="flex flex-col gap-3">
        {ordered.map((genre) => (
          <li
            key={genre.id}
            className={`rounded-(--radius) border border-line p-4 ${genre.parent_id ? "ml-6 sm:ml-12" : ""}`}
          >
            <GenreForm
              action={saveGenre.bind(null, genre.id)}
              genre={genre}
              parents={parents}
            />
            <form action={deleteGenre.bind(null, genre.id)} className="mt-2">
              <ConfirmSubmit
                message={`Delete ${genre.name}? ${genre.releases} release(s) lose this genre.`}
                className="text-sm text-danger underline-offset-4 hover:underline"
              >
                Delete
              </ConfirmSubmit>
              <span className="ml-3 text-xs text-muted">
                {genre.releases} releases
              </span>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
