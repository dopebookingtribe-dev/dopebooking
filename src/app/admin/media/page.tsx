import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { MIGRATION_NOTICE } from "@/lib/supabase/schema-errors";
import {
  formatBytes,
  formatDuration,
  isMediaKind,
  MEDIA_KINDS,
  MEDIA_KIND_LIST,
} from "@/modules/media/constants";
import { LibraryUploader } from "@/modules/media/components/library-uploader";
import { MediaPreview } from "@/modules/media/components/media-preview";
import {
  isMediaSource,
  listMedia,
  MEDIA_SORTS,
  MEDIA_SOURCES,
  PAGE_SIZE,
  requireMediaEditor,
  type MediaFilter,
  type MediaSort,
} from "@/modules/media/library-server";

export const metadata: Metadata = { title: "Media library" };

export default function MediaLibraryPage({
  searchParams,
}: PageProps<"/admin/media">) {
  return (
    <Container className="py-12">
      <AdminHeader title="Media library" />
      <p className="mt-4 max-w-3xl text-muted">
        Upload images, videos, audio and PDFs once and use them anywhere: page
        sections, news posts, videos and artist press kits. Replacing a file
        updates it everywhere; files in use can&apos;t be deleted.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Library searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

const selectClass =
  "min-h-11 rounded-lg border border-line-strong bg-bg px-3 text-sm";

async function Library({
  searchParams,
}: {
  searchParams: PageProps<"/admin/media">["searchParams"];
}) {
  await requireMediaEditor("/admin/media");
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : "";
  };
  const filter: MediaFilter = {
    q: one("q").slice(0, 80) || undefined,
    kind: isMediaKind(one("type"))
      ? (one("type") as MediaFilter["kind"])
      : undefined,
    source: isMediaSource(one("source"))
      ? (one("source") as MediaFilter["source"])
      : "library",
    usage:
      one("usage") === "used" || one("usage") === "unused"
        ? (one("usage") as "used" | "unused")
        : undefined,
    sort: one("sort") in MEDIA_SORTS ? (one("sort") as MediaSort) : "newest",
    page: Math.max(1, Number.parseInt(one("page"), 10) || 1),
  };
  const { items, total, page, migrated } = await listMedia(filter);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (next: Partial<Record<string, string | number>>) => {
    const query = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = {
      q: filter.q,
      type: filter.kind,
      source: filter.source === "library" ? undefined : filter.source,
      usage: filter.usage,
      sort: filter.sort === "newest" ? undefined : filter.sort,
      page,
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "page" && value === 1))
        query.set(key, String(value));
    }
    const text = query.toString();
    return text ? `/admin/media?${text}` : "/admin/media";
  };
  const filtered = Boolean(
    filter.q || filter.kind || filter.usage || filter.source !== "library",
  );

  return (
    <>
      {!migrated ? (
        <p
          role="note"
          className="mt-8 rounded-(--radius) border border-uv/50 bg-uv/5 p-4 text-sm"
        >
          Images work now. Videos, audio and documents need the database update:{" "}
          {MIGRATION_NOTICE}
        </p>
      ) : null}
      {one("deleted") ? (
        <p
          role="status"
          className="mt-8 rounded-(--radius) border border-success/50 p-4 text-sm text-success"
        >
          File deleted.
        </p>
      ) : null}

      <section aria-labelledby="upload" className="mt-10">
        <h2 id="upload" className="font-display text-2xl">
          Upload
        </h2>
        <div className="mt-4">
          <LibraryUploader kinds={migrated ? MEDIA_KIND_LIST : ["image"]} />
        </div>
      </section>

      <section aria-labelledby="browse" className="mt-14">
        <h2 id="browse" className="font-display text-2xl">
          Browse
        </h2>
        <form
          method="get"
          role="search"
          className="mt-4 grid gap-3 rounded-(--radius) border border-line bg-surface-1 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={filter.q ?? ""}
              placeholder="Title, credit or file name"
              className={selectClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Type</span>
            <select
              name="type"
              defaultValue={filter.kind ?? ""}
              className={selectClass}
            >
              <option value="">All types</option>
              {MEDIA_KIND_LIST.map((kind) => (
                <option key={kind} value={kind}>
                  {MEDIA_KINDS[kind].plural}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Where</span>
            <select
              name="source"
              defaultValue={filter.source}
              className={selectClass}
            >
              {Object.entries(MEDIA_SOURCES).map(([key, rule]) => (
                <option key={key} value={key}>
                  {rule.label}
                </option>
              ))}
              <option value="all">Everything</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Use</span>
            <select
              name="usage"
              defaultValue={filter.usage ?? ""}
              className={selectClass}
            >
              <option value="">Used or not</option>
              <option value="used">In use</option>
              <option value="unused">Not used anywhere</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Sort</span>
            <select
              name="sort"
              defaultValue={filter.sort}
              className={selectClass}
            >
              {Object.entries(MEDIA_SORTS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="min-h-11 rounded-full border border-line-strong px-5 text-sm hover:border-accent hover:text-accent"
            >
              Apply
            </button>
            {filtered ? (
              <Link
                href="/admin/media"
                className="min-h-11 content-center text-sm text-muted underline"
              >
                Reset
              </Link>
            ) : null}
          </div>
        </form>

        <p className="mt-6 font-label text-sm text-muted">
          {total} {total === 1 ? "file" : "files"}
          {pages > 1 ? ` · page ${page} of ${pages}` : ""}
        </p>

        {!items.length ? (
          <p className="mt-6 rounded-(--radius) border border-dashed border-line-strong p-8 text-center text-muted">
            {filtered
              ? "No files match these filters."
              : "The library is empty. Drop the first files above."}
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/media/${item.id}`}
                  className="group flex h-full flex-col gap-3 rounded-(--radius) border border-line bg-surface-1 p-3 transition-colors hover:border-accent"
                >
                  <MediaPreview
                    kind={item.kind}
                    url={item.url}
                    alt=""
                    focal={{ x: item.focalX, y: item.focalY }}
                    mimeType={item.mimeType}
                  />
                  <span className="line-clamp-2 text-sm font-medium group-hover:text-accent">
                    {item.alt}
                  </span>
                  <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 font-label text-xs text-muted">
                    <span>{MEDIA_KINDS[item.kind].label}</span>
                    {item.width && item.height ? (
                      <span>
                        {item.width} × {item.height}
                      </span>
                    ) : null}
                    {item.durationSeconds ? (
                      <span>{formatDuration(item.durationSeconds)}</span>
                    ) : null}
                    {item.sizeBytes ? (
                      <span>{formatBytes(item.sizeBytes)}</span>
                    ) : null}
                    {item.isDemo ? <span className="text-uv">Demo</span> : null}
                  </span>
                  <span
                    className={`self-start rounded-full border px-2 py-0.5 font-label text-xs ${
                      item.owner.source !== "library"
                        ? "border-line text-muted"
                        : item.usage.length
                          ? "border-success/50 text-success"
                          : "border-line-strong text-muted"
                    }`}
                  >
                    {item.owner.source !== "library"
                      ? MEDIA_SOURCES[item.owner.source].label
                      : item.usage.length
                        ? `Used in ${item.usage.length} ${item.usage.length === 1 ? "place" : "places"}`
                        : "Not used"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <nav
            aria-label="Pages"
            className="mt-8 flex items-center gap-4 text-sm"
          >
            {page > 1 ? (
              <Link
                href={link({ page: page - 1 })}
                className="underline underline-offset-4"
              >
                ← Previous
              </Link>
            ) : null}
            <span className="text-muted">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link
                href={link({ page: page + 1 })}
                className="underline underline-offset-4"
              >
                Next →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </>
  );
}
