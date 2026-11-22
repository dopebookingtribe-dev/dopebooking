// Shared by the browser uploader and the server checks.
// Must match the storage buckets' allowed types and size limits
// (public-media: 20261021000000_artists.sql, site-files: 20261122000100).
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type MediaKind = "image" | "video" | "audio" | "document";

type KindRule = {
  label: string;
  plural: string;
  bucket: "public-media" | "site-files";
  /** Folder under library/ in the bucket. */
  folder: string;
  types: readonly string[];
  /** File endings, for browsers that report no type (e.g. some .flac). */
  extensions: Record<string, string>;
  maxBytes: number;
  formats: string;
  /** What the file is used for on the site. */
  use: string;
};

export const MEDIA_KINDS: Record<MediaKind, KindRule> = {
  image: {
    label: "Image",
    plural: "Images",
    bucket: "public-media",
    folder: "site",
    types: IMAGE_TYPES,
    extensions: {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      avif: "image/avif",
    },
    maxBytes: MAX_IMAGE_BYTES,
    formats: "JPG, PNG, WebP or AVIF",
    use: "Page heroes, galleries, news covers and photos, share images.",
  },
  video: {
    label: "Video",
    plural: "Videos",
    bucket: "site-files",
    folder: "videos",
    types: ["video/mp4", "video/webm", "video/quicktime"],
    extensions: {
      mp4: "video/mp4",
      m4v: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
    },
    maxBytes: 50 * 1024 * 1024,
    formats: "MP4 (H.264), WebM or MOV",
    use: "Videos section (uploaded instead of a YouTube/Vimeo link) and news posts.",
  },
  audio: {
    label: "Audio",
    plural: "Audio",
    bucket: "site-files",
    folder: "audio",
    types: [
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
      "audio/ogg",
      "audio/flac",
      "audio/x-flac",
    ],
    extensions: {
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      aac: "audio/aac",
      wav: "audio/wav",
      ogg: "audio/ogg",
      oga: "audio/ogg",
      flac: "audio/flac",
    },
    maxBytes: 50 * 1024 * 1024,
    formats: "MP3, M4A/AAC, WAV, OGG or FLAC",
    use: "Players in news posts (mixes, interviews, teasers). Music for sale is uploaded under Music.",
  },
  document: {
    label: "Document",
    plural: "Documents",
    bucket: "site-files",
    folder: "documents",
    types: ["application/pdf"],
    extensions: { pdf: "application/pdf" },
    maxBytes: 50 * 1024 * 1024,
    formats: "PDF",
    use: "Artist press kits and downloads in news posts. Files are public: no private documents.",
  },
};

export const MEDIA_KIND_LIST = Object.keys(MEDIA_KINDS) as MediaKind[];

export function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === "string" && value in MEDIA_KINDS;
}

/** The file's media type, falling back to its ending when the browser gives none. */
export function fileMimeType(file: { name: string; type: string }) {
  if (file.type) return file.type;
  const ending = file.name.split(".").pop()?.toLowerCase() ?? "";
  for (const rule of Object.values(MEDIA_KINDS)) {
    if (rule.extensions[ending]) return rule.extensions[ending];
  }
  return "";
}

export function kindOfMime(mime: string): MediaKind | null {
  for (const kind of MEDIA_KIND_LIST) {
    if (MEDIA_KINDS[kind].types.includes(mime)) return kind;
  }
  return null;
}

/** Storage file ending for a media type. */
export function extensionFor(mime: string) {
  for (const rule of Object.values(MEDIA_KINDS)) {
    for (const [ending, type] of Object.entries(rule.extensions)) {
      if (type === mime) return ending;
    }
  }
  return mime.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "bin";
}

export function formatBytes(bytes: number | null | undefined) {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

/** "summer-teaser_final.mp4" → "Summer teaser final". */
export function titleFromFileName(name: string) {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  const text = base.replace(/\s+/g, " ").slice(0, 300);
  return text ? text[0].toUpperCase() + text.slice(1) : "Untitled file";
}
