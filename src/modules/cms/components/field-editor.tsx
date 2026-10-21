"use client";

import { useId, type ReactNode } from "react";
import type { LibraryImage } from "../admin-queries";
import type { FieldSpec } from "../fields";

export type EditorContext = {
  library: LibraryImage[];
  artists: { id: string; name: string; published: boolean }[];
  categories: { slug: string; name: string }[];
  pickImages: (options: {
    multiple: boolean;
    selected: string[];
    onPick: (ids: string[]) => void;
  }) => void;
  /** Validation messages keyed by dot path, e.g. "items.0.title". */
  errors: Record<string, string>;
};

type Obj = Record<string, unknown>;

export function getPath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === "object" ? (value as Obj)[key] : undefined,
      obj,
    );
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split(".");
  const source = (obj ?? {}) as Obj;
  const copy: Obj = Array.isArray(source)
    ? ([...source] as unknown as Obj)
    : { ...source };
  copy[head] = rest.length
    ? setPath(source[head], rest.join("."), value)
    : value;
  return copy as T;
}

const control =
  "w-full rounded-(--radius) border border-line-strong bg-bg px-3 text-base text-text placeholder:text-muted focus-visible:border-accent aria-invalid:border-danger";

function Shell({
  id,
  label,
  hint,
  error,
  children,
  as = "div",
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  as?: "div" | "fieldset";
}) {
  const Tag = as;
  const labelNode =
    as === "fieldset" ? (
      <legend className="mb-2 text-sm font-medium">{label}</legend>
    ) : (
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
    );
  return (
    <Tag className="flex min-w-0 flex-col gap-2">
      {labelNode}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </Tag>
  );
}

function Thumb({ image }: { image: LibraryImage | undefined }) {
  return (
    <span className="relative block aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-(--radius) bg-surface-2">
      {image ? (
        // Admin thumbnail; plain img keeps the editor light.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={image.alt}
          className="size-full object-cover"
          style={{ objectPosition: `${image.focalX}% ${image.focalY}%` }}
        />
      ) : (
        <span className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">
          No photo
        </span>
      )}
    </span>
  );
}

const smallButton =
  "inline-flex min-h-9 items-center rounded-full border border-line-strong px-3 text-xs text-muted hover:border-text hover:text-text disabled:opacity-40";

/** One field of a section or of the site settings. */
export function FieldEditor({
  spec,
  value,
  onChange,
  ctx,
  errorPath,
}: {
  spec: FieldSpec;
  /** The object that holds this field. */
  value: Obj;
  onChange: (next: Obj) => void;
  ctx: EditorContext;
  /** Dot path of `value` within the whole document, for error lookup. */
  errorPath: string;
}) {
  const id = useId();
  const current = getPath(value, spec.name);
  const set = (next: unknown) => onChange(setPath(value, spec.name, next));
  const path = errorPath ? `${errorPath}.${spec.name}` : spec.name;
  const error = ctx.errors[path];
  const aria = {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error
      ? `${id}-error`
      : spec.hint
        ? `${id}-hint`
        : undefined,
  };

  if (spec.when) {
    const other = String(getPath(value, spec.when.field) ?? "");
    if (!spec.when.is.includes(other)) return null;
  }

  switch (spec.kind) {
    case "text":
      return (
        <Shell id={id} label={spec.label} hint={spec.hint} error={error}>
          {spec.long ? (
            <textarea
              id={id}
              value={String(current ?? "")}
              maxLength={spec.max}
              rows={spec.max > 600 ? 8 : 3}
              onChange={(event) => set(event.target.value)}
              className={`${control} py-2 leading-relaxed`}
              {...aria}
            />
          ) : (
            <input
              id={id}
              value={String(current ?? "")}
              maxLength={spec.max}
              onChange={(event) => set(event.target.value)}
              className={`${control} min-h-11`}
              {...aria}
            />
          )}
        </Shell>
      );

    case "number":
      return (
        <Shell id={id} label={spec.label} hint={spec.hint} error={error}>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={spec.min}
            max={spec.max}
            value={Number(current ?? spec.min)}
            onChange={(event) => set(Number(event.target.value))}
            className={`${control} min-h-11 max-w-40`}
            {...aria}
          />
        </Shell>
      );

    case "select":
      return (
        <Shell id={id} label={spec.label} hint={spec.hint} error={error}>
          <select
            id={id}
            value={String(current ?? "")}
            onChange={(event) => set(event.target.value)}
            className={`${control} min-h-11`}
            {...aria}
          >
            {Object.entries(spec.options).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Shell>
      );

    case "toggle":
      return (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(current)}
            onChange={(event) => set(event.target.checked)}
            className="size-4 accent-(--accent)"
          />
          {spec.label}
        </label>
      );

    case "link": {
      const link = (current ?? { label: "", href: "" }) as {
        label: string;
        href: string;
      };
      const labelError = ctx.errors[`${path}.label`];
      const hrefError = ctx.errors[`${path}.href`];
      return (
        <Shell
          id={id}
          as="fieldset"
          label={spec.label}
          hint={spec.hint ?? "Leave both empty to hide it."}
          error={labelError ?? hrefError}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              aria-label={`${spec.label}: text`}
              placeholder="Button text"
              value={link.label}
              maxLength={60}
              onChange={(event) => set({ ...link, label: event.target.value })}
              className={`${control} min-h-11`}
              aria-invalid={labelError ? true : undefined}
            />
            <input
              aria-label={`${spec.label}: link`}
              placeholder="/artists or https://…"
              value={link.href}
              maxLength={500}
              onChange={(event) => set({ ...link, href: event.target.value })}
              className={`${control} min-h-11`}
              aria-invalid={hrefError ? true : undefined}
            />
          </div>
        </Shell>
      );
    }

    case "image": {
      const selected = String(current ?? "");
      const image = ctx.library.find((item) => item.id === selected);
      return (
        <Shell
          id={id}
          as="fieldset"
          label={spec.label}
          hint={spec.hint}
          error={error}
        >
          <div className="flex items-center gap-4">
            <Thumb image={selected ? image : undefined} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={smallButton}
                onClick={() =>
                  ctx.pickImages({
                    multiple: false,
                    selected: selected ? [selected] : [],
                    onPick: (ids) => set(ids[0] ?? ""),
                  })
                }
              >
                {selected ? "Change photo" : "Choose photo"}
              </button>
              {selected ? (
                <button
                  type="button"
                  className={smallButton}
                  onClick={() => set("")}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          {selected && !image ? (
            <p className="text-sm text-uv">
              This photo is no longer in the media library. Choose another.
            </p>
          ) : null}
        </Shell>
      );
    }

    case "images": {
      const ids = (current as string[] | undefined) ?? [];
      const move = (from: number, to: number) => {
        const next = [...ids];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        set(next);
      };
      return (
        <Shell
          id={id}
          as="fieldset"
          label={spec.label}
          hint={`${ids.length} of up to ${spec.max}.`}
          error={error}
        >
          {ids.length ? (
            <ul className="flex flex-wrap gap-3">
              {ids.map((imageId, index) => (
                <li key={`${imageId}-${index}`} className="flex flex-col gap-1">
                  <Thumb
                    image={ctx.library.find((item) => item.id === imageId)}
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className={smallButton}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label="Move earlier"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className={smallButton}
                      disabled={index === ids.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label="Move later"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className={smallButton}
                      onClick={() => set(ids.filter((_, i) => i !== index))}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <div>
            <button
              type="button"
              className={smallButton}
              disabled={ids.length >= spec.max}
              onClick={() =>
                ctx.pickImages({
                  multiple: true,
                  selected: ids,
                  onPick: (picked) => set(picked.slice(0, spec.max)),
                })
              }
            >
              Choose photos
            </button>
          </div>
        </Shell>
      );
    }

    case "artists": {
      const ids = (current as string[] | undefined) ?? [];
      const available = ctx.artists.filter(
        (artist) => !ids.includes(artist.id),
      );
      const name = (artistId: string) =>
        ctx.artists.find((artist) => artist.id === artistId);
      const move = (from: number, to: number) => {
        const next = [...ids];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        set(next);
      };
      return (
        <Shell
          id={id}
          as="fieldset"
          label={spec.label}
          hint="Only published artists appear on the site."
          error={error}
        >
          {ids.length ? (
            <ol className="flex flex-col gap-2">
              {ids.map((artistId, index) => (
                <li
                  key={artistId}
                  className="flex items-center justify-between gap-3 rounded-(--radius) border border-line px-3 py-2 text-sm"
                >
                  <span>
                    {name(artistId)?.name ?? "Removed artist"}
                    {name(artistId) && !name(artistId)?.published ? (
                      <span className="ml-2 text-xs text-muted">
                        (not published)
                      </span>
                    ) : null}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      className={smallButton}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={smallButton}
                      disabled={index === ids.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={smallButton}
                      onClick={() =>
                        set(ids.filter((value) => value !== artistId))
                      }
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
          {available.length ? (
            <select
              aria-label="Add an artist"
              value=""
              onChange={(event) =>
                event.target.value && set([...ids, event.target.value])
              }
              className={`${control} min-h-11 max-w-sm`}
            >
              <option value="">Add an artist…</option>
              {available.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                  {artist.published ? "" : " (not published)"}
                </option>
              ))}
            </select>
          ) : null}
        </Shell>
      );
    }

    case "category":
      return (
        <Shell
          id={id}
          label={spec.label}
          hint={spec.hint ?? "Manage categories under Admin, Categories."}
          error={error}
        >
          <select
            id={id}
            value={String(current ?? "")}
            onChange={(event) => set(event.target.value)}
            className={`${control} min-h-11`}
            {...aria}
          >
            <option value="">Choose a category</option>
            {ctx.categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </Shell>
      );

    case "strings": {
      const lines = (current as string[] | undefined) ?? [];
      return (
        <Shell
          id={id}
          label={spec.label}
          hint={spec.hint}
          error={
            error ??
            Object.entries(ctx.errors).find(([key]) =>
              key.startsWith(`${path}.`),
            )?.[1]
          }
        >
          <textarea
            id={id}
            rows={Math.max(3, lines.length + 1)}
            value={lines.join("\n")}
            onChange={(event) =>
              set(event.target.value.split("\n").slice(0, spec.max))
            }
            onBlur={(event) =>
              set(
                event.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .slice(0, spec.max),
              )
            }
            className={`${control} py-2 leading-relaxed`}
            {...aria}
          />
        </Shell>
      );
    }

    case "list": {
      const items = (current as Obj[] | undefined) ?? [];
      const update = (index: number, next: Obj) =>
        set(items.map((item, i) => (i === index ? next : item)));
      const move = (from: number, to: number) => {
        const next = [...items];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        set(next);
      };
      return (
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">{spec.label}</legend>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {items.map((item, index) => {
            const itemPath = `${path}.${index}`;
            const itemHasError = Object.keys(ctx.errors).some((key) =>
              key.startsWith(`${itemPath}.`),
            );
            return (
              <details
                key={index}
                open={itemHasError || undefined}
                className="group rounded-(--radius) border border-line bg-bg/40 open:border-line-strong"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 truncate text-sm">
                    <span
                      className={itemHasError ? "text-danger" : "text-muted"}
                    >
                      {index + 1}.
                    </span>{" "}
                    {String(getPath(item, spec.titleField) ?? "") ||
                      `Untitled ${spec.itemLabel}`}
                  </span>
                  <span
                    className="flex shrink-0 gap-1"
                    onClick={(event) => event.preventDefault()}
                  >
                    <button
                      type="button"
                      className={smallButton}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label={`Move ${spec.itemLabel} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={smallButton}
                      disabled={index === items.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label={`Move ${spec.itemLabel} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={smallButton}
                      onClick={() => {
                        if (window.confirm(`Remove this ${spec.itemLabel}?`)) {
                          set(items.filter((_, i) => i !== index));
                        }
                      }}
                      aria-label={`Remove ${spec.itemLabel}`}
                    >
                      ×
                    </button>
                  </span>
                </summary>
                <div className="flex flex-col gap-5 border-t border-line p-4">
                  {spec.fields.map((field) => (
                    <FieldEditor
                      key={field.name}
                      spec={field}
                      value={item}
                      onChange={(next) => update(index, next)}
                      ctx={ctx}
                      errorPath={itemPath}
                    />
                  ))}
                </div>
              </details>
            );
          })}
          <div>
            <button
              type="button"
              className={smallButton}
              disabled={items.length >= spec.max}
              onClick={() => set([...items, structuredClone(spec.empty)])}
            >
              Add {spec.itemLabel}
            </button>
          </div>
        </fieldset>
      );
    }
  }
}
