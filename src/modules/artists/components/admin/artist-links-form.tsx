"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { LinkPlatform } from "@/lib/supabase/database.types";
import { LINK_PLATFORMS } from "../../schemas";

type Row = { key: number; platform: LinkPlatform; url: string };

const inputClass =
  "min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base text-text focus-visible:border-accent";

export function ArtistLinksForm({
  links,
  action,
}: {
  links: { platform: LinkPlatform; url: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [rows, setRows] = useState<Row[]>(() =>
    (links.length ? links : [{ platform: "soundcloud" as const, url: "" }]).map(
      (link, index) => ({ key: index, ...link }),
    ),
  );
  const nextKey = () => Math.max(-1, ...rows.map((row) => row.key)) + 1;
  const update = (key: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li key={row.key} className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor={`platform-${row.key}`}>
              Link {index + 1} platform
            </label>
            <select
              id={`platform-${row.key}`}
              name="platform"
              value={row.platform}
              onChange={(event) =>
                update(row.key, {
                  platform: event.target.value as LinkPlatform,
                })
              }
              className={`${inputClass} sm:w-48`}
            >
              {Object.entries(LINK_PLATFORMS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor={`url-${row.key}`}>
              Link {index + 1} URL
            </label>
            <input
              id={`url-${row.key}`}
              name="url"
              type="url"
              placeholder="https://"
              value={row.url}
              onChange={(event) => update(row.key, { url: event.target.value })}
              className={`${inputClass} flex-1`}
            />
            <Button
              variant="ghost"
              onClick={() =>
                setRows((current) => current.filter((r) => r.key !== row.key))
              }
              aria-label={`Remove link ${index + 1}`}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          onClick={() =>
            setRows((current) => [
              ...current,
              { key: nextKey(), platform: "instagram", url: "" },
            ])
          }
        >
          Add link
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save links"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
