"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { utcToZonedInput } from "@/lib/datetime";
import { initialFormState, type FormState } from "@/lib/forms";

type Row = {
  key: number;
  artist_id: string;
  stage: string;
  set_starts_at: string;
};

const inputClass =
  "min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base text-text focus-visible:border-accent";

export function LineupForm({
  lineup,
  artistOptions,
  timezone,
  action,
}: {
  lineup: {
    artist_id: string;
    stage: string | null;
    set_starts_at: string | null;
  }[];
  artistOptions: { id: string; stage_name: string; status: string }[];
  timezone: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [rows, setRows] = useState<Row[]>(() =>
    lineup.map((row, index) => ({
      key: index,
      artist_id: row.artist_id,
      stage: row.stage ?? "",
      set_starts_at: utcToZonedInput(row.set_starts_at, timezone),
    })),
  );
  const nextKey = () => Math.max(-1, ...rows.map((row) => row.key)) + 1;
  const update = (key: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  const move = (index: number, delta: number) =>
    setRows((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  if (!artistOptions.length) {
    return (
      <p className="text-sm text-muted">Add artists to the roster first.</p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {rows.length ? (
        <ol className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="grid gap-2 rounded-(--radius) border border-line p-3 sm:grid-cols-[1fr_10rem_13rem_auto]"
            >
              <label className="sr-only" htmlFor={`artist-${row.key}`}>
                Act {index + 1}
              </label>
              <select
                id={`artist-${row.key}`}
                name="artist_id"
                value={row.artist_id}
                onChange={(event) =>
                  update(row.key, { artist_id: event.target.value })
                }
                className={inputClass}
              >
                <option value="">Choose artist…</option>
                {artistOptions.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.stage_name}
                    {artist.status === "draft" ? " (draft — hidden)" : ""}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor={`stage-${row.key}`}>
                Act {index + 1} stage
              </label>
              <input
                id={`stage-${row.key}`}
                name="stage"
                placeholder="Stage"
                value={row.stage}
                onChange={(event) =>
                  update(row.key, { stage: event.target.value })
                }
                className={inputClass}
              />
              <label className="sr-only" htmlFor={`time-${row.key}`}>
                Act {index + 1} set time
              </label>
              <input
                id={`time-${row.key}`}
                name="set_starts_at"
                type="datetime-local"
                value={row.set_starts_at}
                onChange={(event) =>
                  update(row.key, { set_starts_at: event.target.value })
                }
                className={inputClass}
              />
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  className="px-3"
                  onClick={() => move(index, -1)}
                  aria-label={`Move act ${index + 1} up`}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  className="px-3"
                  onClick={() => move(index, 1)}
                  aria-label={`Move act ${index + 1} down`}
                  disabled={index === rows.length - 1}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  className="px-3"
                  onClick={() =>
                    setRows((current) =>
                      current.filter((r) => r.key !== row.key),
                    )
                  }
                  aria-label={`Remove act ${index + 1}`}
                >
                  ✕
                </Button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">No acts yet.</p>
      )}
      <p className="text-sm text-muted">
        Set times use the event&apos;s time zone (
        {timezone.replaceAll("_", " ")}). Draft artists are saved but stay
        hidden until published.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          onClick={() =>
            setRows((current) => [
              ...current,
              { key: nextKey(), artist_id: "", stage: "", set_starts_at: "" },
            ])
          }
        >
          Add act
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save lineup"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
