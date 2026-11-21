"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type {
  ArtArtistRow,
  ArtArtworkRow,
  ArtExhibitionRow,
  ArtFestivalRow,
  ArtLinkPlatform,
  ArtPartnerKind,
} from "@/lib/supabase/database.types";
import { STATUSES } from "@/lib/validation";
import {
  ART_LINK_PLATFORMS,
  ARTIST_KINDS,
  DISCIPLINES,
  DISCIPLINE_KEYS,
  PARTNER_KINDS,
  ROLES,
  ROLE_KEYS,
  type Role,
} from "../../schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type Option = { id: string; label: string; hint?: string };

const inputClass =
  "min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base text-text focus-visible:border-accent";
const chipClass =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm has-checked:border-accent has-checked:text-accent";

/** Reads a field: just-submitted value, else the stored one. */
function useValues<T extends Record<string, unknown>>(
  row: T,
  state: FormState,
) {
  return (name: keyof T & string) => {
    const submitted = state.values?.[name];
    if (typeof submitted === "string") return submitted;
    const stored = row[name];
    return stored === null || stored === undefined ? "" : String(stored);
  };
}

function Checkbox({
  name,
  label,
  checked,
  hint,
}: {
  name: string;
  label: string;
  checked: boolean;
  hint?: string;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="mt-0.5 size-4 accent-(--accent)"
      />
      <span>
        {label}
        {hint ? <span className="block text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function Submit({
  pending,
  label = "Save",
  state,
}: {
  pending: boolean;
  label?: string;
  state: FormState;
}) {
  return (
    <div className="flex flex-col gap-3">
      <FormStatus state={state} />
      {state.status === "error" && !state.message ? (
        <p role="alert" className="text-sm text-danger">
          Please check the highlighted fields.
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : label}
      </Button>
    </div>
  );
}

function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-6 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <legend className="mb-2 font-label text-sm text-accent">{legend}</legend>
      {children}
    </fieldset>
  );
}

function StatusAndOrder({
  value,
  error,
  featured,
  featuredLabel,
}: {
  value: (name: string) => string;
  error: (name: string) => string | undefined;
  featured: boolean;
  featuredLabel: string;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      <SelectField
        name="status"
        label="Status"
        defaultValue={value("status")}
        hint="Only published items are public."
      >
        {Object.entries(STATUSES).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </SelectField>
      <Field
        name="sort_order"
        label="Order"
        type="number"
        inputMode="numeric"
        hint="Lower comes first."
        defaultValue={value("sort_order")}
        error={error("sort_order")}
      />
      <div className="self-center">
        <Checkbox name="featured" label={featuredLabel} checked={featured} />
      </div>
    </div>
  );
}

function Seo({
  value,
  error,
}: {
  value: (name: string) => string;
  error: (name: string) => string | undefined;
}) {
  return (
    <Fieldset legend="Search and sharing">
      <Field
        name="seo_title"
        label="SEO title (optional)"
        hint="Up to 70 characters. Empty uses the name."
        defaultValue={value("seo_title")}
        error={error("seo_title")}
      />
      <TextareaField
        name="seo_description"
        label="SEO description (optional)"
        rows={2}
        hint="Up to 200 characters, shown in search results and link previews."
        defaultValue={value("seo_description")}
        error={error("seo_description")}
      />
    </Fieldset>
  );
}

// ---------------------------------------------------------------------------
// Details forms
// ---------------------------------------------------------------------------

export function ArtistDetailsForm({
  artist,
  action,
  countries,
  musicArtists,
}: {
  artist: ArtArtistRow;
  action: Action;
  countries: { code: string; name: string }[];
  musicArtists: { id: string; stage_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = useValues(artist, state) as (name: string) => string;
  const error = (name: string) => state.fieldErrors?.[name]?.[0];
  const disciplines =
    (state.values?.disciplines as string[] | undefined) ?? artist.disciplines;
  const checked = (name: "featured" | "inquiries_enabled") =>
    state.values ? state.values[name] === "on" : artist[name];

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      <Fieldset legend="Identity">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            name="name"
            label="Artistic name"
            required
            defaultValue={value("name")}
            error={error("name")}
          />
          <Field
            name="stage_name"
            label="Also known as (optional)"
            hint="A stage name or alias, shown under the name."
            defaultValue={value("stage_name")}
            error={error("stage_name")}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            name="slug"
            label="URL name"
            hint={`Public page: /art-gallery/artists/${value("slug")}`}
            required
            defaultValue={value("slug")}
            error={error("slug")}
          />
          <SelectField
            name="kind"
            label="Profile type"
            defaultValue={value("kind")}
            hint="A collective lists its members."
          >
            {Object.entries(ARTIST_KINDS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
        <Field
          name="tagline"
          label="Tagline"
          hint="One line for cards and the profile header, up to 160 characters."
          defaultValue={value("tagline")}
          error={error("tagline")}
        />
        <fieldset>
          <legend className="mb-3 text-sm font-medium">
            Disciplines (up to 8)
          </legend>
          <div className="flex flex-wrap gap-2">
            {DISCIPLINE_KEYS.map((key) => (
              <label key={key} className={chipClass}>
                <input
                  type="checkbox"
                  name="disciplines"
                  value={key}
                  defaultChecked={disciplines.includes(key)}
                  className="accent-(--accent)"
                />
                {DISCIPLINES[key]}
              </label>
            ))}
          </div>
          {error("disciplines") ? (
            <p className="mt-2 text-sm text-danger">{error("disciplines")}</p>
          ) : null}
        </fieldset>
        <Field
          name="specialization"
          label="Specialisation (optional)"
          hint="E.g. “UV-reactive large canvases” or “site-specific bamboo structures”."
          defaultValue={value("specialization")}
          error={error("specialization")}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            name="country"
            label="Country"
            defaultValue={value("country")}
            error={error("country")}
          >
            <option value="">Not set</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </SelectField>
          <Field
            name="based_in"
            label="Based in (city)"
            defaultValue={value("based_in")}
            error={error("based_in")}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Story">
        <TextareaField
          name="statement"
          label="Artist statement and creative philosophy"
          rows={5}
          hint="Shown large, as a quote. In the artist's own words where possible. Blank lines start new paragraphs."
          defaultValue={value("statement")}
          error={error("statement")}
        />
        <TextareaField
          name="bio"
          label="Biography"
          rows={9}
          defaultValue={value("bio")}
          error={error("bio")}
        />
        <TextareaField
          name="techniques"
          label="Style and techniques"
          rows={4}
          hint="Materials, methods and influences."
          defaultValue={value("techniques")}
          error={error("techniques")}
        />
      </Fieldset>

      <Fieldset legend="Connections">
        <Field
          name="website_url"
          label="Official website (optional)"
          type="url"
          placeholder="https://"
          defaultValue={value("website_url")}
          error={error("website_url")}
        />
        <SelectField
          name="music_artist_id"
          label="Same person on the music roster (optional)"
          hint="Links the two profiles instead of copying them."
          defaultValue={value("music_artist_id")}
          error={error("music_artist_id")}
        >
          <option value="">Not on the music roster</option>
          {musicArtists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.stage_name}
            </option>
          ))}
        </SelectField>
        <Checkbox
          name="inquiries_enabled"
          label="Show “Invite to your festival” buttons"
          hint="Inquiries arrive in Admin → Service requests (type: Art gallery collaboration)."
          checked={checked("inquiries_enabled")}
        />
      </Fieldset>

      <Fieldset legend="Publication">
        <StatusAndOrder
          value={value}
          error={error}
          featured={checked("featured")}
          featuredLabel="Featured (shown first)"
        />
      </Fieldset>
      <Seo value={value} error={error} />
      <Submit pending={pending} state={state} />
    </form>
  );
}

export function ExhibitionDetailsForm({
  exhibition,
  action,
  countries,
  festivals,
  events,
}: {
  exhibition: ArtExhibitionRow;
  action: Action;
  countries: { code: string; name: string }[];
  festivals: { id: string; name: string }[];
  events: { id: string; title: string; starts_at: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = useValues(exhibition, state) as (name: string) => string;
  const error = (name: string) => state.fieldErrors?.[name]?.[0];
  const featured = state.values
    ? state.values.featured === "on"
    : exhibition.featured;
  const [accent, setAccent] = useState(value("accent_color"));

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      <Fieldset legend="Identity">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            name="title"
            label="Exhibition title"
            required
            defaultValue={value("title")}
            error={error("title")}
          />
          <Field
            name="slug"
            label="URL name"
            hint={`Public page: /art-gallery/exhibitions/${value("slug")}`}
            required
            defaultValue={value("slug")}
            error={error("slug")}
          />
        </div>
        <Field
          name="subtitle"
          label="Subtitle (optional)"
          hint="Shown in italics under the title."
          defaultValue={value("subtitle")}
          error={error("subtitle")}
        />
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field
            name="accent_color"
            label="Accent colour (optional)"
            hint="The exhibition's visual identity: used for thin lines and markers, never for text."
            placeholder="#FFB13B"
            value={accent}
            onChange={(event) => setAccent(event.target.value)}
            error={error("accent_color")}
          />
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(accent) ? accent : "#ffb13b"}
              onChange={(event) => setAccent(event.target.value)}
              className="h-11 w-14 cursor-pointer rounded-(--radius) border border-line-strong bg-surface-1"
              aria-label="Pick the accent colour"
            />
          </label>
        </div>
      </Fieldset>

      <Fieldset legend="Festival, place and dates">
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            name="festival_id"
            label="Festival"
            hint="Add festivals in Art Gallery → Festivals."
            defaultValue={value("festival_id")}
            error={error("festival_id")}
          >
            <option value="">No festival</option>
            {festivals.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            name="event_id"
            label="DopeBooking event page (optional)"
            hint="Links to its line-up and tickets."
            defaultValue={value("event_id")}
            error={error("event_id")}
          >
            <option value="">None</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.starts_at.slice(0, 10)})
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field
            name="venue_name"
            label="Venue or area"
            defaultValue={value("venue_name")}
            error={error("venue_name")}
          />
          <Field
            name="city"
            label="City or region"
            defaultValue={value("city")}
            error={error("city")}
          />
          <SelectField
            name="country"
            label="Country"
            defaultValue={value("country")}
            error={error("country")}
          >
            <option value="">Not set</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field
            name="starts_on"
            label="Opens"
            type="date"
            defaultValue={value("starts_on")}
            error={error("starts_on")}
          />
          <Field
            name="ends_on"
            label="Closes (optional)"
            type="date"
            defaultValue={value("ends_on")}
            error={error("ends_on")}
          />
          <Field
            name="date_note"
            label="Date note (optional)"
            hint="Shown when there are no dates, e.g. “Summer 2027”."
            defaultValue={value("date_note")}
            error={error("date_note")}
          />
        </div>
        <p className="text-sm text-muted">
          Now on view, upcoming and archive are worked out from these dates
          automatically.
        </p>
        <Field
          name="external_url"
          label="Festival or event website (optional)"
          type="url"
          placeholder="https://"
          defaultValue={value("external_url")}
          error={error("external_url")}
        />
      </Fieldset>

      <Fieldset legend="Texts">
        <TextareaField
          name="summary"
          label="Summary"
          rows={2}
          hint="One or two sentences, up to 300 characters. Shown large at the top of the page."
          defaultValue={value("summary")}
          error={error("summary")}
        />
        <TextareaField
          name="overview"
          label="Overview"
          rows={8}
          defaultValue={value("overview")}
          error={error("overview")}
        />
        <TextareaField
          name="concept"
          label="Artistic concept"
          rows={4}
          hint="The idea behind the exhibition. Shown as a quote."
          defaultValue={value("concept")}
          error={error("concept")}
        />
      </Fieldset>

      <Fieldset legend="Publication">
        <StatusAndOrder
          value={value}
          error={error}
          featured={featured}
          featuredLabel="Featured (shown first)"
        />
      </Fieldset>
      <Seo value={value} error={error} />
      <Submit pending={pending} state={state} />
    </form>
  );
}

export function ArtworkDetailsForm({
  work,
  action,
}: {
  work: ArtArtworkRow;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = useValues(work, state) as (name: string) => string;
  const error = (name: string) => state.fieldErrors?.[name]?.[0];
  const featured = state.values
    ? state.values.featured === "on"
    : work.featured;

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      <Fieldset legend="Wall label">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            name="title"
            label="Title"
            required
            defaultValue={value("title")}
            error={error("title")}
          />
          <Field
            name="slug"
            label="URL name"
            hint={`Public page: /art-gallery/works/${value("slug")}`}
            required
            defaultValue={value("slug")}
            error={error("slug")}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field
            name="year"
            label="Year"
            type="number"
            inputMode="numeric"
            defaultValue={value("year")}
            error={error("year")}
          />
          <SelectField
            name="discipline"
            label="Discipline"
            defaultValue={value("discipline")}
            error={error("discipline")}
          >
            <option value="">Not set</option>
            {DISCIPLINE_KEYS.map((key) => (
              <option key={key} value={key}>
                {DISCIPLINES[key]}
              </option>
            ))}
          </SelectField>
          <Field
            name="medium"
            label="Medium and technique"
            hint="E.g. “Acrylic and UV pigment on canvas”."
            defaultValue={value("medium")}
            error={error("medium")}
          />
        </div>
      </Fieldset>
      <Fieldset legend="Physical size (optional)">
        <div className="grid grid-cols-3 gap-4">
          <Field
            name="height_cm"
            label="Height (cm)"
            inputMode="decimal"
            defaultValue={value("height_cm")}
            error={error("height_cm")}
          />
          <Field
            name="width_cm"
            label="Width (cm)"
            inputMode="decimal"
            defaultValue={value("width_cm")}
            error={error("width_cm")}
          />
          <Field
            name="depth_cm"
            label="Depth (cm)"
            inputMode="decimal"
            defaultValue={value("depth_cm")}
            error={error("depth_cm")}
          />
        </div>
        <Field
          name="dimensions_note"
          label="Size note"
          hint="E.g. “Variable, site-specific” or “Diameter 6 m”."
          defaultValue={value("dimensions_note")}
          error={error("dimensions_note")}
        />
      </Fieldset>
      <Fieldset legend="About the work">
        <TextareaField
          name="description"
          label="Description"
          rows={6}
          defaultValue={value("description")}
          error={error("description")}
        />
      </Fieldset>
      <Fieldset legend="Publication">
        <StatusAndOrder
          value={value}
          error={error}
          featured={featured}
          featuredLabel="Featured (hero wall, shown first)"
        />
      </Fieldset>
      <Submit pending={pending} state={state} />
    </form>
  );
}

export function FestivalForm({
  festival,
  action,
  countries,
}: {
  festival: Partial<ArtFestivalRow> | null;
  action: Action;
  countries: { code: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = useValues(festival ?? {}, state) as (name: string) => string;
  const error = (name: string) => state.fieldErrors?.[name]?.[0];
  return (
    <form
      action={formAction}
      className="flex max-w-2xl flex-col gap-6"
      noValidate
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="name"
          label="Festival name"
          required
          defaultValue={value("name")}
          error={error("name")}
        />
        <Field
          name="slug"
          label="Short name (optional)"
          hint="Lowercase with dashes; made from the name if empty."
          defaultValue={value("slug")}
          error={error("slug")}
        />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="city"
          label="City or region"
          defaultValue={value("city")}
          error={error("city")}
        />
        <SelectField
          name="country"
          label="Country"
          defaultValue={value("country")}
          error={error("country")}
        >
          <option value="">Not set</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </SelectField>
      </div>
      <Field
        name="website_url"
        label="Website"
        type="url"
        placeholder="https://"
        defaultValue={value("website_url")}
        error={error("website_url")}
      />
      <TextareaField
        name="description"
        label="Notes (optional)"
        rows={3}
        defaultValue={value("description")}
        error={error("description")}
      />
      <Field
        name="sort_order"
        label="Order"
        type="number"
        defaultValue={value("sort_order") || "0"}
        error={error("sort_order")}
      />
      <p className="text-sm text-muted">
        A festival appears on the public site only once a published exhibition
        names it. Only add festivals you have really exhibited at or confirmed.
      </p>
      <Submit
        pending={pending}
        state={state}
        label={festival?.id ? "Save" : "Add festival"}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Row editors
// ---------------------------------------------------------------------------

function useRows<T>(initial: T[]) {
  const [rows, setRows] = useState(() =>
    initial.map((row, key) => ({ key, ...row })),
  );
  const next = () => Math.max(-1, ...rows.map((r) => r.key)) + 1;
  return {
    rows,
    add: (row: T) =>
      setRows((current) => [...current, { key: next(), ...row }]),
    update: (key: number, patch: Partial<T>) =>
      setRows((current) =>
        current.map((r) => (r.key === key ? { ...r, ...patch } : r)),
      ),
    remove: (key: number) =>
      setRows((current) => current.filter((r) => r.key !== key)),
    move: (key: number, delta: number) =>
      setRows((current) => {
        const index = current.findIndex((r) => r.key === key);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= current.length) return current;
        const copy = [...current];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        return copy;
      }),
  };
}

function RowControls({
  index,
  count,
  label,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        className="min-w-11 px-2!"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label={`Move ${label} up`}
      >
        ↑
      </Button>
      <Button
        variant="ghost"
        className="min-w-11 px-2!"
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        aria-label={`Move ${label} down`}
      >
        ↓
      </Button>
      <Button
        variant="ghost"
        className="px-2!"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        Remove
      </Button>
    </div>
  );
}

function Picker({
  id,
  name,
  value,
  options,
  onChange,
  label,
  empty = "Choose…",
}: {
  id: string;
  name: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string;
  empty?: string;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} min-w-0 flex-1`}
      >
        <option value="">{empty}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
            {option.hint ? ` (${option.hint})` : ""}
          </option>
        ))}
      </select>
    </>
  );
}

export function ArtLinksForm({
  links,
  action,
}: {
  links: { platform: ArtLinkPlatform; url: string }[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const { rows, add, update, remove, move } = useRows(
    links.length
      ? links
      : [{ platform: "instagram" as ArtLinkPlatform, url: "" }],
  );
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <label className="sr-only" htmlFor={`platform-${row.key}`}>
              Link {index + 1} platform
            </label>
            <select
              id={`platform-${row.key}`}
              name="platform"
              value={row.platform}
              onChange={(event) =>
                update(row.key, {
                  platform: event.target.value as ArtLinkPlatform,
                })
              }
              className={`${inputClass} sm:w-44`}
            >
              {Object.entries(ART_LINK_PLATFORMS).map(([key, label]) => (
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
              className={`${inputClass} min-w-0 flex-1`}
            />
            <RowControls
              index={index}
              count={rows.length}
              label={`link ${index + 1}`}
              onMove={(d) => move(row.key, d)}
              onRemove={() => remove(row.key)}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => add({ platform: "website", url: "" })}
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

export function MembersForm({
  members,
  options,
  action,
}: {
  members: { member_id: string; note: string | null }[];
  options: Option[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const { rows, add, update, remove, move } = useRows(
    members.map((m) => ({ member_id: m.member_id, note: m.note ?? "" })),
  );
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {rows.length ? (
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <Picker
                id={`member-${row.key}`}
                name="member_id"
                value={row.member_id}
                options={options}
                onChange={(member_id) => update(row.key, { member_id })}
                label={`Member ${index + 1}`}
              />
              <label className="sr-only" htmlFor={`member-note-${row.key}`}>
                Member {index + 1} note
              </label>
              <input
                id={`member-note-${row.key}`}
                name="note"
                placeholder="Role in the collective (optional)"
                value={row.note}
                onChange={(event) =>
                  update(row.key, { note: event.target.value })
                }
                className={`${inputClass} sm:w-60`}
              />
              <RowControls
                index={index}
                count={rows.length}
                label={`member ${index + 1}`}
                onMove={(d) => move(row.key, d)}
                onRemove={() => remove(row.key)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No members yet. Members are individual artist profiles; create them
          first under Artists.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => add({ member_id: "", note: "" })}
        >
          Add member
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save members"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

/** Exhibition line-up: artist, roles for this show, a short note, order. */
export function ParticipantsForm({
  lineup,
  options,
  action,
}: {
  lineup: { art_artist_id: string; roles: string[]; note: string | null }[];
  options: Option[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const { rows, add, update, remove, move } = useRows(
    lineup.map((row) => ({
      art_artist_id: row.art_artist_id,
      roles: row.roles,
      note: row.note ?? "",
    })),
  );
  const toggle = (key: number, roles: string[], role: Role) =>
    update(key, {
      roles: roles.includes(role)
        ? roles.filter((r) => r !== role)
        : [...roles, role],
    });

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {rows.length ? (
        <ol className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="rounded-(--radius) border border-line p-4"
            >
              <input type="hidden" name="row" value={row.key} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="font-label text-sm text-muted sm:w-6">
                  {index + 1}
                </span>
                <Picker
                  id={`artist-${row.key}`}
                  name="art_artist_id"
                  value={row.art_artist_id}
                  options={options}
                  onChange={(art_artist_id) =>
                    update(row.key, { art_artist_id })
                  }
                  label={`Artist ${index + 1}`}
                />
                <RowControls
                  index={index}
                  count={rows.length}
                  label={`artist ${index + 1}`}
                  onMove={(d) => move(row.key, d)}
                  onRemove={() => remove(row.key)}
                />
              </div>
              <fieldset className="mt-3">
                <legend className="sr-only">Roles of artist {index + 1}</legend>
                <div className="flex flex-wrap gap-2">
                  {ROLE_KEYS.map((role) => (
                    <label
                      key={role}
                      className={`${chipClass} min-h-9! px-3! text-xs`}
                    >
                      <input
                        type="checkbox"
                        name={`roles.${row.key}`}
                        value={role}
                        checked={row.roles.includes(role)}
                        onChange={() => toggle(row.key, row.roles, role)}
                        className="accent-(--accent)"
                      />
                      {ROLES[role].label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="sr-only" htmlFor={`note-${row.key}`}>
                Note for artist {index + 1}
              </label>
              <input
                id={`note-${row.key}`}
                name="note"
                placeholder="Note for this show (optional), e.g. “Main dome installation”"
                value={row.note}
                onChange={(event) =>
                  update(row.key, { note: event.target.value })
                }
                className={`${inputClass} mt-3 w-full`}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">No artists yet.</p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          onClick={() =>
            add({ art_artist_id: "", roles: ["artist"], note: "" })
          }
        >
          Add artist
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save artists"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

/** Artwork credits: one or more artists, each with an optional credit line. */
export function CreditsForm({
  credits,
  options,
  action,
}: {
  credits: { art_artist_id: string; credit: string | null }[];
  options: Option[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const { rows, add, update, remove, move } = useRows(
    (credits.length ? credits : [{ art_artist_id: "", credit: "" }]).map(
      (c) => ({
        art_artist_id: c.art_artist_id,
        credit: c.credit ?? "",
      }),
    ),
  );
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <Picker
              id={`credit-${row.key}`}
              name="art_artist_id"
              value={row.art_artist_id}
              options={options}
              onChange={(art_artist_id) => update(row.key, { art_artist_id })}
              label={`Artist ${index + 1}`}
            />
            <label className="sr-only" htmlFor={`credit-text-${row.key}`}>
              Credit line for artist {index + 1}
            </label>
            <input
              id={`credit-text-${row.key}`}
              name="credit"
              placeholder="Credit (optional), e.g. “Light design”"
              value={row.credit}
              onChange={(event) =>
                update(row.key, { credit: event.target.value })
              }
              className={`${inputClass} sm:w-60`}
            />
            <RowControls
              index={index}
              count={rows.length}
              label={`artist ${index + 1}`}
              onMove={(d) => move(row.key, d)}
              onRemove={() => remove(row.key)}
            />
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Credit everyone who made the work; collaborative works show “Made
        together”.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => add({ art_artist_id: "", credit: "" })}
        >
          Add artist
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save credits"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

/**
 * An ordered selection from a list (artworks in an exhibition, featured
 * order). Posts the chosen ids in order under `name`.
 */
export function OrderedPickerForm({
  name,
  selected,
  options,
  action,
  addLabel,
  saveLabel = "Save",
  emptyText,
  allowAdd = true,
}: {
  name: string;
  selected: string[];
  options: Option[];
  action: Action;
  addLabel: string;
  saveLabel?: string;
  emptyText: string;
  allowAdd?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [ids, setIds] = useState(selected);
  const [adding, setAdding] = useState("");
  const byId = new Map(options.map((o) => [o.id, o]));
  const remaining = options.filter((o) => !ids.includes(o.id));
  const move = (index: number, delta: number) =>
    setIds((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {ids.length ? (
        <ol className="flex flex-col divide-y divide-line rounded-(--radius) border border-line">
          {ids.map((id, index) => (
            <li
              key={id}
              className="flex flex-wrap items-center gap-3 px-4 py-2"
            >
              <input type="hidden" name={name} value={id} />
              <span className="w-6 font-label text-sm text-muted">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {byId.get(id)?.label ?? "Unknown"}
                {byId.get(id)?.hint ? (
                  <span className="ml-2 text-sm text-muted">
                    {byId.get(id)?.hint}
                  </span>
                ) : null}
              </span>
              <RowControls
                index={index}
                count={ids.length}
                label={byId.get(id)?.label ?? "item"}
                onMove={(d) => move(index, d)}
                onRemove={() =>
                  setIds((current) => current.filter((x) => x !== id))
                }
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">{emptyText}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {allowAdd && remaining.length ? (
          <>
            <Picker
              id={`${name}-add`}
              name=""
              value={adding}
              options={remaining}
              onChange={setAdding}
              label={addLabel}
              empty={addLabel}
            />
            <Button
              variant="secondary"
              disabled={!adding}
              onClick={() => {
                setIds((current) => [...current, adding]);
                setAdding("");
              }}
            >
              Add
            </Button>
          </>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : saveLabel}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

/** Checkbox list (artwork → exhibitions it was shown at). */
export function CheckListForm({
  name,
  selected,
  options,
  action,
  emptyText,
}: {
  name: string;
  selected: string[];
  options: Option[];
  action: Action;
  emptyText: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {options.length ? (
        <ul className="flex flex-col gap-1">
          {options.map((option) => (
            <li key={option.id}>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name={name}
                  value={option.id}
                  defaultChecked={selected.includes(option.id)}
                  className="size-4 accent-(--accent)"
                />
                <span>
                  {option.label}
                  {option.hint ? (
                    <span className="ml-2 text-muted">{option.hint}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{emptyText}</p>
      )}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function PartnersForm({
  partners,
  logos,
  action,
}: {
  partners: {
    name: string;
    kind: ArtPartnerKind;
    url: string | null;
    logo_asset_id: string | null;
  }[];
  logos: Option[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const { rows, add, update, remove, move } = useRows(
    partners.map((p) => ({
      name: p.name,
      kind: p.kind,
      url: p.url ?? "",
      logo_asset_id: p.logo_asset_id ?? "",
    })),
  );
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {rows.length ? (
        <ul className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="grid gap-2 rounded-(--radius) border border-line p-4 sm:grid-cols-2"
            >
              <input
                aria-label={`Partner ${index + 1} name`}
                name="name"
                placeholder="Name"
                value={row.name}
                onChange={(event) =>
                  update(row.key, { name: event.target.value })
                }
                className={inputClass}
              />
              <select
                aria-label={`Partner ${index + 1} type`}
                name="kind"
                value={row.kind}
                onChange={(event) =>
                  update(row.key, {
                    kind: event.target.value as ArtPartnerKind,
                  })
                }
                className={inputClass}
              >
                {Object.entries(PARTNER_KINDS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Partner ${index + 1} website`}
                name="url"
                type="url"
                placeholder="https:// (optional)"
                value={row.url}
                onChange={(event) =>
                  update(row.key, { url: event.target.value })
                }
                className={inputClass}
              />
              <select
                aria-label={`Partner ${index + 1} logo`}
                name="logo_asset_id"
                value={row.logo_asset_id}
                onChange={(event) =>
                  update(row.key, { logo_asset_id: event.target.value })
                }
                className={inputClass}
              >
                <option value="">No logo (show the name)</option>
                {logos.map((logo) => (
                  <option key={logo.id} value={logo.id}>
                    {logo.label}
                  </option>
                ))}
              </select>
              <div className="sm:col-span-2">
                <RowControls
                  index={index}
                  count={rows.length}
                  label={`partner ${index + 1}`}
                  onMove={(d) => move(row.key, d)}
                  onRemove={() => remove(row.key)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No partners. Only list organisations that really supported this
          exhibition.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          onClick={() =>
            add({ name: "", kind: "partner", url: "", logo_asset_id: "" })
          }
        >
          Add partner
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save partners"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function DeleteItemForm({
  label,
  action,
}: {
  label: string;
  action: (prev: FormState) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col items-start gap-4">
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (
            !window.confirm(
              `Delete ${label} and its images? This can't be undone. Archive it instead to keep it.`,
            )
          ) {
            event.preventDefault();
          }
        }}
        className="inline-flex min-h-11 items-center rounded-full border border-danger px-6 text-sm font-semibold text-danger hover:bg-danger hover:text-bg"
      >
        {pending ? "Deleting…" : `Delete ${label}`}
      </button>
      <FormStatus state={state} />
    </form>
  );
}
