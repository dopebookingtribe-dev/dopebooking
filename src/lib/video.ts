import type { VideoProvider } from "@/lib/supabase/database.types";

export type VideoSource = { provider: VideoProvider; ref: string };

export const VIDEO_PROVIDERS: Record<VideoProvider, string> = {
  cloudflare_stream: "Cloudflare Stream",
  mux: "Mux",
  youtube: "YouTube",
  vimeo: "Vimeo",
};

const ID = /^[A-Za-z0-9_-]+$/;
const CLOUDFLARE_HOST = /^(customer-[a-z0-9]+)\.cloudflarestream\.com$/;

/**
 * Turns a pasted video link into a provider + reference.
 * Only known hosts are accepted, and references are restricted to
 * [A-Za-z0-9_-], so embed URLs built from them can't be abused.
 */
export function parseVideoUrl(input: string): VideoSource | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const valid = (ref: string | undefined | null) =>
    ref && ID.test(ref) ? ref : null;

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const ref =
      parts[0] === "watch"
        ? url.searchParams.get("v")
        : ["embed", "shorts", "live"].includes(parts[0] ?? "")
          ? parts[1]
          : null;
    const id = valid(ref);
    return id ? { provider: "youtube", ref: id } : null;
  }
  if (host === "youtu.be") {
    const id = valid(parts[0]);
    return id ? { provider: "youtube", ref: id } : null;
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const ref = host === "player.vimeo.com" ? parts[1] : parts[0];
    return ref && /^\d+$/.test(ref) ? { provider: "vimeo", ref } : null;
  }

  if (host === "player.mux.com" || host === "stream.mux.com") {
    const id = valid(parts[0]?.replace(/\.m3u8$/, ""));
    return id ? { provider: "mux", ref: id } : null;
  }

  const cloudflare = host.match(CLOUDFLARE_HOST);
  if (cloudflare) {
    const id = valid(parts[0]);
    return id
      ? { provider: "cloudflare_stream", ref: `${cloudflare[1]}/${id}` }
      : null;
  }

  return null;
}

function splitCloudflare(ref: string) {
  const [customer, id] = ref.split("/");
  return { customer, id };
}

/** Privacy-friendly player URL (no tracking cookies where supported). */
export function embedUrl({ provider, ref }: VideoSource): string {
  switch (provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${ref}?autoplay=1&rel=0`;
    case "vimeo":
      return `https://player.vimeo.com/video/${ref}?autoplay=1&dnt=1`;
    case "mux":
      return `https://player.mux.com/${ref}?autoplay=true`;
    case "cloudflare_stream": {
      const { customer, id } = splitCloudflare(ref);
      return `https://${customer}.cloudflarestream.com/${id}/iframe?autoplay=true`;
    }
  }
}

/** Provider thumbnail when one exists without an API call. */
export function providerThumbnail({ provider, ref }: VideoSource) {
  switch (provider) {
    case "youtube":
      return `https://i.ytimg.com/vi/${ref}/hqdefault.jpg`;
    case "mux":
      return `https://image.mux.com/${ref}/thumbnail.jpg?width=1280`;
    case "cloudflare_stream": {
      const { customer, id } = splitCloudflare(ref);
      return `https://${customer}.cloudflarestream.com/${id}/thumbnails/thumbnail.jpg?height=720`;
    }
    case "vimeo":
      return null;
  }
}

/** Link back to the provider's own page, for admins. */
export function sourceUrl({ provider, ref }: VideoSource): string {
  switch (provider) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${ref}`;
    case "vimeo":
      return `https://vimeo.com/${ref}`;
    case "mux":
      return `https://player.mux.com/${ref}`;
    case "cloudflare_stream": {
      const { customer, id } = splitCloudflare(ref);
      return `https://${customer}.cloudflarestream.com/${id}/watch`;
    }
  }
}
