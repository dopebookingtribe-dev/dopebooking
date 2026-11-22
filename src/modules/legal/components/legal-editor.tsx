"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextareaField } from "@/components/ui/field";
import { parseBody } from "@/modules/posts/body";
import { PostBody } from "@/modules/posts/components/post-body";
import { revertLegal, saveLegal, type LegalResult } from "../actions";
import type { LegalContent } from "../schema";

const PLACEHOLDER = /\[[A-Z][A-Z0-9 /…,.&-]*\]/g;

export function LegalEditor({
  doc,
  content,
  canPublish,
  isLive,
}: {
  doc: string;
  content: LegalContent;
  canPublish: boolean;
  isLive: boolean;
}) {
  const [state, action, pending] = useActionState<LegalResult, FormData>(
    saveLegal.bind(null, doc),
    null,
  );
  const [body, setBody] = useState(content.body);
  const [reverting, startRevert] = useTransition();
  const [revertResult, setRevertResult] = useState<LegalResult>(null);
  const blocks = useMemo(() => parseBody(body), [body]);
  const placeholders = body.match(PLACEHOLDER) ?? [];

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
        <Field
          name="title"
          label="Page title"
          defaultValue={content.title}
          maxLength={120}
          required
          error={state?.fieldErrors?.title}
        />
        <Field
          name="updated"
          label="“Last updated” date"
          defaultValue={content.updated}
          maxLength={40}
          error={state?.fieldErrors?.updated}
        />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="showDraftNotice"
          defaultChecked={content.showDraftNotice}
          className="size-4 accent-(--accent)"
        />
        Show the “Draft, being reviewed” notice (untick once a lawyer has
        approved the text)
      </label>
      {placeholders.length ? (
        <p
          role="note"
          className="rounded-(--radius) border border-uv/50 bg-uv/5 p-3 text-sm"
        >
          {placeholders.length} placeholder
          {placeholders.length === 1 ? "" : "s"} still to fill in:{" "}
          <span className="font-label text-xs">
            {[...new Set(placeholders)].slice(0, 8).join(" ")}
          </span>
          {new Set(placeholders).size > 8 ? " …" : ""}
        </p>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <TextareaField
          name="body"
          label="Text"
          rows={28}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          error={state?.fieldErrors?.body}
          hint="## heading · - list item · **bold** · [link](/legal/privacy) · blank line = new paragraph."
          className="font-mono [&_textarea]:text-sm"
        />
        <div>
          <p className="text-sm font-medium">Preview</p>
          <div className="mt-2 max-h-[46rem] overflow-y-auto rounded-(--radius) border border-line p-5">
            <PostBody blocks={blocks} embeds={{}} size="base" />
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 -mx-2 flex flex-wrap items-center gap-3 border-t border-line bg-bg/95 px-2 py-4 backdrop-blur">
        <Button
          type="submit"
          name="intent"
          value="draft"
          variant="secondary"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save draft"}
        </Button>
        {canPublish ? (
          <Button
            type="submit"
            name="intent"
            value="publish"
            disabled={pending}
          >
            Save and publish
          </Button>
        ) : (
          <span className="text-sm text-muted">
            A super admin publishes your draft.
          </span>
        )}
        {state ? (
          <p
            role={state.ok ? "status" : "alert"}
            className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}
          >
            {state.message}
          </p>
        ) : null}
        {canPublish && isLive ? (
          <Button
            variant="ghost"
            disabled={reverting}
            className="ml-auto text-danger"
            onClick={() => {
              if (
                !window.confirm(
                  "Remove the edited version and show the original page again?",
                )
              )
                return;
              startRevert(async () => setRevertResult(await revertLegal(doc)));
            }}
          >
            {reverting ? "Removing…" : "Use the original page"}
          </Button>
        ) : null}
        {revertResult ? (
          <p
            role="status"
            className={`text-sm ${revertResult.ok ? "text-success" : "text-danger"}`}
          >
            {revertResult.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
