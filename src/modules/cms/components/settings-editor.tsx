"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  discardSettingsDraft,
  publishSettings,
  saveSettingsDraft,
  type SaveResult,
} from "../actions";
import type { LibraryImage } from "../admin-queries";
import { SETTINGS_FIELDS } from "../fields";
import type { SiteSettings } from "../schema";
import { FieldEditor } from "./field-editor";
import { MediaPicker, type PickRequest } from "./media-picker";

export function SettingsEditor({
  initial,
  hasUnpublished,
  canPublish,
  library,
}: {
  initial: SiteSettings;
  hasUnpublished: boolean;
  canPublish: boolean;
  library: LibraryImage[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [unpublished, setUnpublished] = useState(hasUnpublished);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [picker, setPicker] = useState<PickRequest | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    if (result && !result.ok) {
      for (const issue of result.issues) map[issue.path] = issue.message;
    }
    return map;
  }, [result]);

  const run = (action: () => Promise<SaveResult>, after: () => void) =>
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) {
        after();
        router.refresh();
      }
    });

  const json = () => JSON.stringify(settings);
  const ctx = {
    library,
    artists: [],
    categories: [],
    pickImages: setPicker,
    errors,
  };

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-(--gutter) border-b border-line bg-bg/95 px-(--gutter) py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            role="status"
            className={`text-sm ${dirty || unpublished ? "text-uv" : "text-muted"}`}
          >
            {pending
              ? "Working…"
              : dirty
                ? "Unsaved changes"
                : unpublished
                  ? "Draft differs from the live site"
                  : "Live version is up to date"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(
                  () => saveSettingsDraft(json()),
                  () => {
                    setDirty(false);
                    setUnpublished(true);
                  },
                )
              }
            >
              Save draft
            </Button>
            {canPublish ? (
              <Button
                disabled={pending}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Publish these settings? The header and footer change on every page.",
                    )
                  )
                    return;
                  run(
                    () => publishSettings(json()),
                    () => {
                      setDirty(false);
                      setUnpublished(false);
                    },
                  );
                }}
              >
                Publish
              </Button>
            ) : null}
          </div>
        </div>
        {result ? (
          <p
            role={result.ok ? "status" : "alert"}
            className={`mt-2 text-sm ${result.ok ? "text-success" : "text-danger"}`}
          >
            {result.message}
          </p>
        ) : null}
      </div>

      <div className="mt-10 flex flex-col gap-14">
        {SETTINGS_FIELDS.map((group) => (
          <section
            key={group.title}
            className="grid gap-6 border-t border-line pt-8 lg:grid-cols-[14rem_1fr] lg:gap-12"
          >
            <h2 className="font-display text-2xl">{group.title}</h2>
            <div className="flex max-w-3xl min-w-0 flex-col gap-6">
              {group.fields.map((spec) => (
                <FieldEditor
                  key={spec.name}
                  spec={spec}
                  value={settings as unknown as Record<string, unknown>}
                  onChange={(next) => {
                    setSettings(next as unknown as SiteSettings);
                    setDirty(true);
                  }}
                  ctx={ctx}
                  errorPath=""
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-14 border-t border-line pt-8">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Throw away the draft settings?")) return;
            run(
              () => discardSettingsDraft(),
              () => window.location.reload(),
            );
          }}
        >
          Discard draft
        </Button>
      </div>

      <MediaPicker
        request={picker}
        library={library}
        onClose={() => setPicker(null)}
      />
    </div>
  );
}
