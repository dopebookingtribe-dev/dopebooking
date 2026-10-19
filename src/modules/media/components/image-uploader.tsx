"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "../constants";
import type { ImageResult, RegisterImageInput } from "../server";

const EXTENSIONS: Record<(typeof IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type Message = { error: boolean; text: string };

function checkFile(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: use a JPG, PNG, WebP or AVIF image.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: the photo must be under 8 MB.`;
  }
  return null;
}

/**
 * Uploads straight from the browser to Supabase Storage (avoids server body
 * limits), then asks the server to verify and record each file.
 * With `multiple`, every file gets the same description unless one is typed.
 */
export function ImageUploader({
  folder,
  register,
  multiple = false,
  defaultAlt,
}: {
  folder: string;
  register: (input: RegisterImageInput) => Promise<ImageResult>;
  multiple?: boolean;
  defaultAlt?: string;
}) {
  const router = useRouter();
  const fileId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>();
  const [busy, setBusy] = useState(false);

  async function uploadOne(file: File, altText: string, credit: string) {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();

    const ext = EXTENSIONS[file.type as keyof typeof EXTENSIONS];
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("public-media")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) throw new Error(`${file.name}: upload failed.`);

    const result = await register({
      path,
      alt_text: altText,
      credit,
      width,
      height,
    });
    if (!result.ok) {
      await supabase.storage.from("public-media").remove([path]);
      throw new Error(`${file.name}: ${result.message}`);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = data
      .getAll("file")
      .filter((file): file is File => file instanceof File && file.size > 0);
    const altText = String(data.get("alt_text") ?? "").trim() || defaultAlt;
    const credit = String(data.get("credit") ?? "").trim();

    if (!files.length) {
      return setMessage({ error: true, text: "Choose a photo first." });
    }
    const invalid = files.map(checkFile).find(Boolean);
    if (invalid) return setMessage({ error: true, text: invalid });
    if (!altText) {
      return setMessage({
        error: true,
        text: "Describe the photo for screen readers.",
      });
    }

    setBusy(true);
    const failures: string[] = [];
    for (const [index, file] of files.entries()) {
      setMessage({
        error: false,
        text:
          files.length > 1
            ? `Uploading ${index + 1} of ${files.length}…`
            : "Uploading…",
      });
      try {
        await uploadOne(file, altText, credit);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : file.name);
      }
    }
    setBusy(false);

    if (failures.length < files.length) {
      form.reset();
      setPreview(null);
      router.refresh();
    }
    setMessage(
      failures.length
        ? { error: true, text: failures.join(" ") }
        : {
            error: false,
            text:
              files.length > 1
                ? `${files.length} photos added.`
                : "Photo added.",
          },
    );
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
            {multiple ? "Photos" : "Photo"}
          </label>
          <input
            id={fileId}
            name="file"
            type="file"
            multiple={multiple}
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
            JPG, PNG, WebP or AVIF, up to 8 MB
            {multiple ? " each. You can select many at once." : "."}
          </p>
        </div>
        <Field
          name="alt_text"
          label={
            defaultAlt ? "Description (optional)" : "Description (alt text)"
          }
          hint={
            defaultAlt
              ? `Leave empty to use “${defaultAlt}”.`
              : "What's in the photo, e.g. “Artist DJing at sunrise, arms raised”."
          }
          maxLength={300}
        />
        <Field name="credit" label="Photo credit (optional)" maxLength={120} />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={busy}>
            {busy ? "Uploading…" : multiple ? "Upload photos" : "Upload photo"}
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
