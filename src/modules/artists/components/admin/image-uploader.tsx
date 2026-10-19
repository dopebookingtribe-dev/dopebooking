"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import type { ImageResult } from "../../actions";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "../../schemas";

const EXTENSIONS: Record<(typeof IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Uploads straight from the browser to Supabase Storage (avoids server body
 * limits), then asks the server to verify and record it.
 */
export function ImageUploader({
  artistId,
  register,
}: {
  artistId: string;
  register: (input: {
    path: string;
    alt_text: string;
    credit: string;
    width: number;
    height: number;
  }) => Promise<ImageResult>;
}) {
  const router = useRouter();
  const fileId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const altText = String(data.get("alt_text") ?? "").trim();
    const credit = String(data.get("credit") ?? "").trim();

    if (!(file instanceof File) || file.size === 0) {
      return setMessage({ error: true, text: "Choose a photo first." });
    }
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return setMessage({
        error: true,
        text: "Use a JPG, PNG, WebP or AVIF image.",
      });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return setMessage({ error: true, text: "The photo must be under 8 MB." });
    }
    if (!altText) {
      return setMessage({
        error: true,
        text: "Describe the photo for screen readers.",
      });
    }

    setBusy(true);
    setMessage({ error: false, text: "Uploading…" });
    try {
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;
      bitmap.close();

      const ext = EXTENSIONS[file.type as keyof typeof EXTENSIONS];
      const path = `artists/${artistId}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("public-media")
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadError) throw new Error("Upload failed. Please try again.");

      const result = await register({
        path,
        alt_text: altText,
        credit,
        width,
        height,
      });
      if (!result.ok) {
        await supabase.storage.from("public-media").remove([path]);
        throw new Error(result.message);
      }

      form.reset();
      setPreview(null);
      setMessage({ error: false, text: "Photo added." });
      router.refresh();
    } catch (error) {
      setMessage({
        error: true,
        text: error instanceof Error ? error.message : "Upload failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-6 rounded-(--radius) border border-line p-5 sm:grid-cols-[10rem_1fr]"
      noValidate
    >
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-(--radius) bg-surface-2 text-center text-xs text-muted">
        {preview ? (
          // Local blob preview; next/image can't optimise blob: URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          "No photo chosen"
        )}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={fileId} className="text-sm font-medium">
            Photo
          </label>
          <input
            id={fileId}
            name="file"
            type="file"
            accept={IMAGE_TYPES.join(",")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview((old) => {
                if (old) URL.revokeObjectURL(old);
                return file ? URL.createObjectURL(file) : null;
              });
              setMessage(undefined);
            }}
            className="text-sm file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-(--radius) file:border file:border-line-strong file:bg-surface-1 file:px-4 file:text-text"
          />
          <p className="text-sm text-muted">
            JPG, PNG, WebP or AVIF, up to 8 MB.
          </p>
        </div>
        <Field
          name="alt_text"
          label="Description (alt text)"
          hint="What's in the photo, e.g. “Artist DJing at sunrise, arms raised”."
          maxLength={300}
        />
        <Field name="credit" label="Photo credit (optional)" maxLength={120} />
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={busy}>
            {busy ? "Uploading…" : "Upload photo"}
          </Button>
          {message ? (
            <p
              role={message.error ? "alert" : "status"}
              className={`text-sm ${message.error ? "text-danger" : "text-muted"}`}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
