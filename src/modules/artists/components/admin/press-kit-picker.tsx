"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import { LibraryUploader } from "@/modules/media/components/library-uploader";

export function PressKitPicker({
  current,
  documents,
  action,
}: {
  current: string | null;
  documents: { id: string; title: string; url: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [value, setValue] = useState(current ?? "");
  const chosen = documents.find((doc) => doc.id === value);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium">PDF from the media library</span>
        <select
          name="press_kit_asset_id"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base"
        >
          <option value="">No press kit</option>
          {value && !chosen ? (
            <option value={value}>Just uploaded</option>
          ) : null}
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
      </label>
      {chosen ? (
        <a
          href={chosen.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline underline-offset-4"
        >
          Open {chosen.title} ↗
        </a>
      ) : null}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">
          Upload a new PDF (up to 50 MB)
        </summary>
        <div className="mt-3">
          <LibraryUploader
            kinds={["document"]}
            multiple={false}
            showRules={false}
            label="Drop the press kit PDF here"
            onUploaded={(ids) => ids[0] && setValue(ids[0])}
          />
        </div>
      </details>
      <div className="flex items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save press kit"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
