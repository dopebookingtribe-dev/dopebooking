"use client";

import { useState, useTransition } from "react";
import { setRolePermission, type RoleResult } from "./actions";
import {
  EDITABLE_PERMISSION_ROLES,
  PERMISSION_LABELS,
  ROLE_LABELS,
} from "./roles";

/** Roles × permissions with checkboxes; admin is shown fixed. */
export function PermissionMatrix({
  granted,
}: {
  granted: Record<string, string[]>;
}) {
  const [state, setState] = useState(granted);
  const [result, setResult] = useState<RoleResult>(null);
  const [pending, start] = useTransition();
  const roles = ["admin", ...EDITABLE_PERMISSION_ROLES];

  const toggle = (role: string, permission: string, grant: boolean) => {
    if (
      !grant &&
      !window.confirm(
        `Remove “${PERMISSION_LABELS[permission].label}” from ${ROLE_LABELS[role] ?? role}?`,
      )
    ) {
      return;
    }
    start(async () => {
      const outcome = await setRolePermission(role, permission, grant);
      setResult(outcome);
      if (outcome?.ok) {
        setState((current) => ({
          ...current,
          [role]: grant
            ? [...new Set([...(current[role] ?? []), permission])]
            : (current[role] ?? []).filter((p) => p !== permission),
        }));
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-(--radius) border border-line">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-surface-1 font-label text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-normal">
                Permission
              </th>
              {roles.map((role) => (
                <th
                  key={role}
                  scope="col"
                  className="px-4 py-3 text-center font-normal"
                >
                  {ROLE_LABELS[role] ?? role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.entries(PERMISSION_LABELS).map(([permission, info]) => (
              <tr key={permission} className="align-top">
                <th scope="row" className="px-4 py-3 font-normal">
                  <span className="block font-medium">{info.label}</span>
                  <span className="block text-xs text-muted">{info.body}</span>
                </th>
                {roles.map((role) => {
                  const on = (state[role] ?? []).includes(permission);
                  const fixed = role === "admin";
                  return (
                    <td key={role} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={fixed ? true : on}
                        disabled={fixed || pending}
                        onChange={(event) =>
                          toggle(role, permission, event.target.checked)
                        }
                        aria-label={`${info.label} for ${ROLE_LABELS[role] ?? role}`}
                        className="size-4 accent-(--accent)"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Super admins always have every permission. Changes apply on the next
        page load and are written to the audit log.
      </p>
      {result ? (
        <p
          role={result.ok ? "status" : "alert"}
          className={`text-sm ${result.ok ? "text-success" : "text-danger"}`}
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
