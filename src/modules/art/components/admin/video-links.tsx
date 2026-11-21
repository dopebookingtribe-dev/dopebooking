import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { linkArtVideo, unlinkArtVideo } from "../../actions";

type VideoOption = {
  id: string;
  title: string;
  status: string;
  art_artist_id: string | null;
  art_exhibition_id: string | null;
};

/** Link existing videos (Admin → Videos) to an art profile or exhibition. */
export function VideoLinks({
  kind,
  ownerId,
  videos,
  column,
}: {
  kind: "artist" | "exhibition";
  ownerId: string;
  videos: VideoOption[];
  column: "art_artist_id" | "art_exhibition_id";
}) {
  const linked = videos.filter((v) => v[column] === ownerId);
  const available = videos.filter((v) => v[column] !== ownerId);
  return (
    <div className="flex flex-col gap-5">
      {linked.length ? (
        <ul className="divide-y divide-line rounded-(--radius) border border-line">
          {linked.map((video) => (
            <li
              key={video.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-2"
            >
              <span>
                <Link
                  href={`/admin/videos/${video.id}`}
                  className="underline underline-offset-4"
                >
                  {video.title}
                </Link>
                {video.status !== "published" ? (
                  <span className="ml-2 text-sm text-muted">
                    {video.status}
                  </span>
                ) : null}
              </span>
              <form action={unlinkArtVideo.bind(null, kind, ownerId, video.id)}>
                <button
                  type="submit"
                  className={buttonClasses("ghost", "min-h-9 px-3 text-xs")}
                >
                  Unlink
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No videos linked.</p>
      )}
      {available.length ? (
        <form
          action={linkArtVideo.bind(null, kind, ownerId)}
          className="flex flex-wrap gap-3"
        >
          <label className="sr-only" htmlFor={`video-${ownerId}`}>
            Video to link
          </label>
          <select
            id={`video-${ownerId}`}
            name="video_id"
            required
            className="min-h-11 min-w-0 flex-1 rounded-(--radius) border border-line-strong bg-surface-1 px-3"
          >
            <option value="">Choose a video…</option>
            {available.map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}
                {video.status !== "published" ? ` (${video.status})` : ""}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClasses("secondary")}>
            Link video
          </button>
        </form>
      ) : null}
      <Link
        href="/admin/videos/new"
        className="text-sm underline underline-offset-4"
      >
        Add a new video
      </Link>
    </div>
  );
}
