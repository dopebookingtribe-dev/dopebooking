"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { MusicGenreRow } from "@/lib/supabase/database.types";
import { centsToInput } from "@/modules/marketplace/schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ReviewForm({
  action,
  status,
}: {
  action: Action;
  status: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const options =
    status === "published"
      ? [["archived", "Take off the store"]]
      : [
          ["published", "Approve and publish"],
          ["rejected", "Send back with changes"],
          ["archived", "Archive"],
        ];
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Decision</legend>
        {options.map(([value, label], index) => (
          <label
            key={value}
            className="flex min-h-11 items-center gap-3 rounded-(--radius) border border-line px-4 has-checked:border-accent"
          >
            <input
              type="radio"
              name="decision"
              value={value}
              defaultChecked={index === 0}
              className="accent-(--accent)"
            />
            {label}
          </label>
        ))}
      </fieldset>
      <TextareaField
        name="note"
        label="Note to the artist"
        rows={4}
        hint="Required when sending back: say exactly what to fix."
        defaultValue={fieldValue(state, "note", null)}
        error={fieldError(state, "note")}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save decision"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function CurationForm({
  action,
  featured,
  sortOrder,
}: {
  action: Action;
  featured: boolean;
  sortOrder: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-5"
      noValidate
    >
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={featured}
          className="size-5 accent-(--accent)"
        />
        Featured in the music store
      </label>
      <Field
        name="sort_order"
        label="Order"
        inputMode="numeric"
        defaultValue={fieldValue(state, "sort_order", sortOrder)}
        error={fieldError(state, "sort_order")}
        className="w-28"
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <FormStatus state={state} />
    </form>
  );
}

export function GenreForm({
  action,
  genre,
  parents,
}: {
  action: Action;
  genre?: MusicGenreRow;
  parents: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,2fr)_6rem_auto_auto] sm:items-end"
      noValidate
    >
      <Field
        name="name"
        label="Name"
        required
        defaultValue={fieldValue(state, "name", genre?.name)}
        error={fieldError(state, "name")}
      />
      <Field
        name="slug"
        label="URL name"
        hint={genre ? undefined : "Leave empty to make one"}
        defaultValue={fieldValue(state, "slug", genre?.slug)}
        error={fieldError(state, "slug")}
      />
      <SelectField
        name="parent_id"
        label="Inside"
        defaultValue={fieldValue(state, "parent_id", genre?.parent_id)}
        error={fieldError(state, "parent_id")}
      >
        <option value="">Top level</option>
        {parents
          .filter((parent) => parent.id !== genre?.id)
          .map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
      </SelectField>
      <Field
        name="sort_order"
        label="Order"
        inputMode="numeric"
        defaultValue={fieldValue(state, "sort_order", genre?.sort_order ?? 0)}
        error={fieldError(state, "sort_order")}
      />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="visible"
          defaultChecked={genre ? genre.visible : true}
          className="size-5 accent-(--accent)"
        />
        Shown
      </label>
      <div className="flex flex-col gap-1">
        <Button
          type="submit"
          variant={genre ? "secondary" : "primary"}
          disabled={pending}
        >
          {pending ? "Saving…" : genre ? "Save" : "Add genre"}
        </Button>
      </div>
      <div className="sm:col-span-6">
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function MemberForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-4"
      noValidate
    >
      <Field
        name="email"
        type="email"
        label="Account email"
        required
        autoComplete="off"
        defaultValue={fieldValue(state, "email", null)}
        error={fieldError(state, "email")}
        className="min-w-64 flex-1"
      />
      <SelectField
        name="member_role"
        label="Role"
        defaultValue={fieldValue(state, "member_role", "owner")}
      >
        <option value="owner">Artist</option>
        <option value="manager">Manager</option>
      </SelectField>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Linking…" : "Link account"}
      </Button>
      <div className="w-full">
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function CommissionForm({
  action,
  bps,
  defaultBps,
}: {
  action: Action;
  bps: number | null;
  defaultBps: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-4"
      noValidate
    >
      <Field
        name="commission_percent"
        label="Commission %"
        inputMode="decimal"
        placeholder={`${defaultBps / 100} (default)`}
        defaultValue={fieldValue(
          state,
          "commission_percent",
          bps === null ? null : bps / 100,
        )}
        error={fieldError(state, "commission_percent")}
        className="w-44"
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <FormStatus state={state} />
    </form>
  );
}

export function MusicSettingsForm({
  action,
  settings,
}: {
  action: Action;
  settings: {
    commission_bps: number;
    hold_days: number;
    min_withdrawal: number;
  };
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-3" noValidate>
      <Field
        name="commission_percent"
        label="Default commission %"
        inputMode="decimal"
        hint="Applies to new sales. Artist overrides win."
        defaultValue={fieldValue(
          state,
          "commission_percent",
          settings.commission_bps / 100,
        )}
        error={fieldError(state, "commission_percent")}
      />
      <Field
        name="hold_days"
        label="Hold before withdrawable (days)"
        inputMode="numeric"
        hint="Covers refunds and chargebacks."
        defaultValue={fieldValue(state, "hold_days", settings.hold_days)}
        error={fieldError(state, "hold_days")}
      />
      <Field
        name="min_withdrawal"
        label="Minimum payout (EUR)"
        inputMode="decimal"
        defaultValue={fieldValue(
          state,
          "min_withdrawal",
          centsToInput(settings.min_withdrawal),
        )}
        error={fieldError(state, "min_withdrawal")}
      />
      <div className="flex items-center gap-4 sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function AdjustmentForm({
  artists,
  actions,
}: {
  artists: { id: string; name: string }[];
  /** addAdjustment bound to each artist id. */
  actions: Record<string, Action>;
}) {
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  if (!artists.length)
    return <p className="text-sm text-muted">No artists yet.</p>;
  return (
    <div className="flex flex-col gap-4">
      <SelectField
        label="Artist"
        value={artistId}
        onChange={(event) => setArtistId(event.target.value)}
        className="max-w-sm"
      >
        {artists.map((artist) => (
          <option key={artist.id} value={artist.id}>
            {artist.name}
          </option>
        ))}
      </SelectField>
      <AdjustmentFields key={artistId} action={actions[artistId]} />
    </div>
  );
}

function AdjustmentFields({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-4"
      noValidate
    >
      <Field
        name="amount"
        label="Amount (EUR)"
        inputMode="decimal"
        placeholder="10.00 or -10.00"
        defaultValue={fieldValue(state, "amount", null)}
        error={fieldError(state, "amount")}
        className="w-44"
      />
      <Field
        name="note"
        label="Reason (the artist sees it)"
        required
        defaultValue={fieldValue(state, "note", null)}
        error={fieldError(state, "note")}
        className="min-w-64 flex-1"
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adding…" : "Add to ledger"}
      </Button>
      <div className="w-full">
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function WithdrawalDecisionForm({
  action,
  status,
}: {
  action: Action;
  status: "requested" | "approved";
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [choice, setChoice] = useState(
    status === "requested" ? "approved" : "paid",
  );
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-wrap gap-2">
        {(status === "requested"
          ? ["approved", "paid", "rejected"]
          : ["paid", "rejected"]
        ).map((value) => (
          <label
            key={value}
            className="flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm has-checked:border-accent"
          >
            <input
              type="radio"
              name="status"
              value={value}
              checked={choice === value}
              onChange={() => setChoice(value)}
              className="accent-(--accent)"
            />
            {value === "approved"
              ? "Approve"
              : value === "paid"
                ? "Mark as paid"
                : "Reject"}
          </label>
        ))}
      </div>
      {choice === "paid" ? (
        <Field
          name="reference"
          label="Bank transfer reference"
          required
          defaultValue={fieldValue(state, "reference", null)}
          error={fieldError(state, "reference")}
          hint="Send the bank transfer first, then record it here."
        />
      ) : (
        <input type="hidden" name="reference" value="" />
      )}
      <Field
        name="note"
        label={choice === "rejected" ? "Reason (required)" : "Note (optional)"}
        defaultValue={fieldValue(state, "note", null)}
        error={fieldError(state, "note")}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
