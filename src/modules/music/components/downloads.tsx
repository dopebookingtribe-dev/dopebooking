import { Picture } from "@/components/ui/picture";
import type { LibraryRelease } from "../queries";
import { FILE_FORMATS, RELEASE_TYPES } from "../schemas";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Purchased releases with a download button per track and format. Links go
 * through our server, which checks the purchase and hands out a short link.
 */
export function MusicDownloads({
  releases,
  token,
}: {
  releases: LibraryRelease[];
  /** Guest orders: the private order token. */
  token?: string;
}) {
  const href = (entitlementId: string, fileId: string) => {
    const params = new URLSearchParams({ e: entitlementId, f: fileId });
    if (token) params.set("t", token);
    return `/api/music/download?${params}`;
  };
  return (
    <ul className="flex flex-col gap-8">
      {releases.map((release) => (
        <li
          key={release.entitlementId}
          className="rounded-(--radius) border border-line bg-surface-1 p-5"
        >
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              {release.cover ? (
                <Picture image={release.cover} decorative sizes="5rem" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-2xl">{release.title}</p>
              <p className="text-sm text-muted">
                {release.artistName} · {RELEASE_TYPES[release.type]} · bought{" "}
                {dateFormat.format(new Date(release.purchasedAt))}
                {release.orderReference ? ` · ${release.orderReference}` : ""}
              </p>
            </div>
          </div>
          <ol className="mt-5 divide-y divide-line border-t border-line">
            {release.tracks.map((track, index) => (
              <li
                key={track.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <p className="min-w-0 text-sm">
                  <span className="mr-2 font-label text-xs text-muted tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {track.title}
                  {release.type === "bundle" ? (
                    <span className="text-muted"> · {track.releaseTitle}</span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {track.files.map((file) => (
                    <a
                      key={file.id}
                      href={href(release.entitlementId, file.id)}
                      rel="nofollow"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent/60 px-4 text-sm text-accent transition-colors hover:bg-accent hover:text-accent-ink"
                    >
                      <span aria-hidden>↓</span>
                      {FILE_FORMATS[file.format].label}
                      <span className="sr-only">
                        {" "}
                        download of {track.title}
                      </span>
                      <span className="font-label text-xs opacity-70">
                        {(file.sizeBytes / 1024 / 1024).toFixed(0)} MB
                      </span>
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}
