"use client";

import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import {
  extensionFor,
  fileMimeType,
  formatBytes,
  kindOfMime,
  MEDIA_KINDS,
  type MediaKind,
} from "./constants";

export type ProbedFile = {
  file: File;
  kind: MediaKind;
  mime: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
};

/** Checks type and size, then reads dimensions or running time. */
export async function probeFile(
  file: File,
  allowed?: MediaKind[],
): Promise<ProbedFile> {
  const mime = fileMimeType(file);
  const kind = kindOfMime(mime);
  if (!kind || (allowed && !allowed.includes(kind))) {
    const formats = (allowed ?? (Object.keys(MEDIA_KINDS) as MediaKind[]))
      .map((k) => MEDIA_KINDS[k].formats)
      .join("; ");
    throw new Error(
      `${file.name}: this type of file isn't supported. Use ${formats}.`,
    );
  }
  const rule = MEDIA_KINDS[kind];
  if (file.size > rule.maxBytes) {
    throw new Error(
      `${file.name} is ${formatBytes(file.size)}. ${rule.plural} must be under ${formatBytes(rule.maxBytes)}.`,
    );
  }
  let width: number | null = null;
  let height: number | null = null;
  let durationSeconds: number | null = null;
  if (kind === "image") {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    width = bitmap.width;
    height = bitmap.height;
    bitmap.close();
  } else if (kind === "video" || kind === "audio") {
    const meta = await readMediaMetadata(file, kind);
    width = meta.width;
    height = meta.height;
    durationSeconds = meta.duration;
  }
  return { file, kind, mime, width, height, durationSeconds };
}

function readMediaMetadata(file: File, kind: "video" | "audio") {
  return new Promise<{
    width: number | null;
    height: number | null;
    duration: number | null;
  }>((resolve) => {
    const url = URL.createObjectURL(file);
    const element = document.createElement(kind);
    const done = (value: {
      width: number | null;
      height: number | null;
      duration: number | null;
    }) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const video = element as HTMLVideoElement;
      done({
        width: kind === "video" && video.videoWidth ? video.videoWidth : null,
        height:
          kind === "video" && video.videoHeight ? video.videoHeight : null,
        duration: Number.isFinite(element.duration)
          ? Math.round(element.duration)
          : null,
      });
    };
    // Some formats (e.g. MOV in Firefox) can't be read here; upload anyway.
    element.onerror = () => done({ width: null, height: null, duration: null });
    element.src = url;
  });
}

/** Storage path for a new library file of this kind. */
export function libraryPath(kind: MediaKind, mime: string) {
  return `library/${MEDIA_KINDS[kind].folder}/${crypto.randomUUID()}.${extensionFor(mime)}`;
}

/**
 * Uploads straight from the browser to Supabase Storage with progress
 * (avoids server body limits). Storage policies decide who may write where.
 */
export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  mime: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token)
    throw new Error("Your session has ended. Sign in again, then retry.");
  const env = getPublicEnv();
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const encoded = path.split("/").map(encodeURIComponent).join("/");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/${bucket}/${encoded}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.setRequestHeader("x-upsert", "false");
    // Paths are never reused, so files can be cached for a year.
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let reason = "";
      try {
        reason = JSON.parse(xhr.responseText).message ?? "";
      } catch {
        // Not JSON; keep the status.
      }
      reject(
        new Error(
          xhr.status === 413 || /size/i.test(reason)
            ? `${file.name}: the file is larger than the storage limit.`
            : xhr.status === 403 || xhr.status === 401
              ? `${file.name}: you don't have permission to upload here.`
              : `${file.name}: upload failed${reason ? ` (${reason})` : ""}.`,
        ),
      );
    };
    xhr.onerror = () =>
      reject(new Error(`${file.name}: network error during upload.`));
    xhr.onabort = () => reject(new Error(`${file.name}: upload cancelled.`));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

export async function removeUpload(bucket: string, path: string) {
  await createClient().storage.from(bucket).remove([path]);
}
