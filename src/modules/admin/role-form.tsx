"use client";

import { useActionState } from "react";
import { changeRole, type RoleResult } from "./actions";
import { GRANTABLE_ROLES, ROLE_LABELS } from "./roles";

export function RoleForm({
  userId,
  roles,
  isSelf,
}: {
  userId: string;
  roles: string[];
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState<RoleResult, FormData>(
    changeRole.bind(null, userId),
    null,
  );
  const grantable = GRANTABLE_ROLES.filter((role) => !roles.includes(role));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <form key={role} action={action}>
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="intent" value="revoke" />
            <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line-strong pl-3 text-xs">
              {ROLE_LABELS[role] ?? role}
              {(GRANTABLE_ROLES as readonly string[]).includes(role) &&
              !isSelf ? (
                <button
                  type="submit"
                  disabled={pending}
                  aria-label={`Remove ${ROLE_LABELS[role] ?? role}`}
                  onClick={(event) => {
                    if (
                      !window.confirm(
                        `Remove the ${ROLE_LABELS[role] ?? role} role?`,
                      )
                    )
                      event.preventDefault();
                  }}
                  className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full hover:text-danger"
                >
                  ×
                </button>
              ) : (
                <span className="pr-3" />
              )}
            </span>
          </form>
        ))}
      </div>
      {grantable.length ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="intent" value="grant" />
          <select
            name="role"
            aria-label="Role to add"
            className="min-h-9 rounded-(--radius) border border-line-strong bg-bg px-2 text-sm"
          >
            {grantable.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            onClick={(event) => {
              const select = event.currentTarget.form?.elements.namedItem(
                "role",
              ) as HTMLSelectElement | null;
              if (
                select?.value === "admin" &&
                !window.confirm(
                  "Super admins can change everything, including roles. Continue?",
                )
              ) {
                event.preventDefault();
              }
            }}
            className="min-h-9 rounded-full border border-line-strong px-3 text-xs hover:border-accent hover:text-accent"
          >
            Add role
          </button>
        </form>
      ) : null}
      {state ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
