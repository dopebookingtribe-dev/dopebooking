"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = ".zip,.pdf,.mp3,.wav,.flac,.aiff,.aif,.jpg,.jpeg,.png";

/** Uploads a download file straight to the private bucket, then records it. */
export function FileUploader({
  productId,
  register,
}: {
  productId: string;
  register: (input: {
    path: string;
    fileName: string;
  }) => Promise<{ ok: true } | { ok: false; message: string }>;
}) {
  const router = useRouter();
  const inputId = useId();
  const [message, setMessage] = useState<{ error: boolean; text: string }>();
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > MAX_BYTES)
      return setMessage({ error: true, text: "Files must be under 50 MB." });
    setBusy(true);
    setMessage({ error: false, text: `Uploading ${file.name}…` });
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
    const path = `products/${productId}/${crypto.randomUUID()}/${safeName}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("digital-goods")
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (error) {
      setBusy(false);
      return setMessage({
        error: true,
        text: "Upload failed. Allowed: ZIP, PDF, MP3, WAV, FLAC, AIFF, JPG, PNG.",
      });
    }
    const result = await register({ path, fileName: file.name });
    setBusy(false);
    if (!result.ok) {
      await supabase.storage.from("digital-goods").remove([path]);
      return setMessage({ error: true, text: result.message });
    }
    setMessage({ error: false, text: "File added." });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        Add a download file
      </label>
      <input
        id={inputId}
        type="file"
        accept={ACCEPT}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file).finally(() => (event.target.value = ""));
        }}
        className="text-sm file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-(--radius) file:border file:border-line-strong file:bg-surface-1 file:px-4 file:text-text"
      />
      <p className="text-sm text-muted">
        ZIP, PDF, audio (MP3, WAV, FLAC, AIFF) or images, up to 50 MB. Only
        buyers can download.
      </p>
      {message ? (
        <p
          role={message.error ? "alert" : "status"}
          className={`text-sm ${message.error ? "text-danger" : "text-muted"}`}
        >
          {message.text}
        </p>
      ) : null}
      {busy ? (
        <Button disabled className="self-start">
          Uploading…
        </Button>
      ) : null}
    </div>
  );
}
