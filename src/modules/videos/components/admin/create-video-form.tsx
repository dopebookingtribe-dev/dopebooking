"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import { VideoSourceField, type VideoFileOption } from "./video-source-field";

export function CreateVideoForm({
  action,
  files,
  filesEnabled,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  files: VideoFileOption[];
  filesEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex max-w-2xl flex-col gap-6"
      noValidate
    >
      <Field
        name="title"
        label="Title"
        hint="e.g. “Boom 2026 — Official Aftermovie”"
        required
        autoComplete="off"
        defaultValue={fieldValue(state, "title", null)}
        error={fieldError(state, "title")}
      />
      <VideoSourceField
        defaultSource={
          (state.values?.source as "link" | "file" | undefined) ?? "link"
        }
        defaultUrl={fieldValue(state, "url", null)}
        defaultFileId={fieldValue(state, "file_asset_id", null)}
        files={files}
        filesEnabled={filesEnabled}
        urlError={fieldError(state, "url")}
        fileError={fieldError(state, "file_asset_id")}
      />
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}
