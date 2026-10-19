"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { COUNTRIES } from "@/lib/countries";
import { initialFormState, type FormState } from "@/lib/forms";
import type { ArtistRow } from "@/lib/supabase/database.types";
import { GENRES, GENRE_KEYS, STATUSES } from "../../schemas";

export function ArtistDetailsForm({
  artist,
  action,
}: {
  artist: ArtistRow;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof ArtistRow) => {
    const submitted = state.values?.[name];
    if (submitted !== undefined) return submitted;
    const stored = artist[name];
    return stored === null || stored === undefined ? "" : String(stored);
  };
  const genres =
    (state.values?.genres as string[] | undefined) ?? artist.genres;
  const featured = state.values
    ? state.values.featured === "on"
    : artist.featured;
  const error = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="stage_name"
          label="Stage name"
          required
          defaultValue={value("stage_name")}
          error={error("stage_name")}
        />
        <Field
          name="slug"
          label="URL name"
          hint={`Public page: /artists/${value("slug")}`}
          required
          defaultValue={value("slug")}
          error={error("slug")}
        />
      </div>

      <Field
        name="tagline"
        label="Tagline"
        hint="One line shown on cards, up to 160 characters."
        defaultValue={value("tagline")}
        error={error("tagline")}
      />

      <TextareaField
        name="bio"
        label="Biography"
        rows={8}
        defaultValue={value("bio")}
        error={error("bio")}
        hint="Separate paragraphs with an empty line."
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="country"
          label="Country"
          defaultValue={value("country")}
          error={error("country")}
        >
          <option value="">Not set</option>
          {COUNTRIES.map((country) => (
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

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">Genres (up to 6)</legend>
        <div className="flex flex-wrap gap-2">
          {GENRE_KEYS.map((genre) => (
            <label
              key={genre}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm has-checked:border-accent has-checked:text-accent"
            >
              <input
                type="checkbox"
                name="genres"
                value={genre}
                defaultChecked={genres.includes(genre)}
                className="accent-(--accent)"
              />
              {GENRES[genre]}
            </label>
          ))}
        </div>
        {error("genres") ? (
          <p className="text-sm text-danger">{error("genres")}</p>
        ) : null}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-3">
        <SelectField
          name="status"
          label="Status"
          defaultValue={value("status")}
          hint="Only published artists are public."
        >
          {Object.entries(STATUSES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field
          name="sort_order"
          label="Sort order"
          type="number"
          inputMode="numeric"
          hint="Lower numbers appear first."
          defaultValue={value("sort_order")}
          error={error("sort_order")}
        />
        <label className="flex min-h-11 items-center gap-3 self-center text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={featured}
            className="size-4 accent-(--accent)"
          />
          Featured on the home page
        </label>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
