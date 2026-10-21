import { getPublicEnv } from "@/lib/env";

export type Image = {
  id: string;
  url: string;
  alt: string;
  credit: string | null;
  width: number;
  height: number;
  /** CSS object-position from the focal point set in the admin. */
  position: string;
};

type MediaRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  alt_text: string;
  credit: string | null;
  width: number | null;
  height: number | null;
  focal_x?: number | null;
  focal_y?: number | null;
};

/** Public URL for an object in a public Supabase Storage bucket. */
export function publicObjectUrl(bucket: string, path: string) {
  const base = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
}

export function toImage(row: MediaRow): Image {
  return {
    id: row.id,
    url: publicObjectUrl(row.storage_bucket, row.storage_path),
    alt: row.alt_text,
    credit: row.credit,
    // Dimensions are recorded on upload; the fallback keeps layout stable.
    width: row.width ?? 1600,
    height: row.height ?? 2000,
    position: `${row.focal_x ?? 50}% ${row.focal_y ?? 50}%`,
  };
}
