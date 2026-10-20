import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Meta } from "@/components/ui/meta";
import type { ContentStatus } from "@/lib/supabase/database.types";
import { STATUSES } from "@/lib/validation";

export function AdminHeader({
  title,
  eyebrow = "Admin",
  backHref,
  backLabel,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  action?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <header>
      {backHref ? (
        <Link href={backHref} className="text-sm text-muted hover:text-text">
          ← {backLabel}
        </Link>
      ) : null}
      <div
        className={`flex flex-wrap items-end justify-between gap-4 ${backHref ? "mt-8" : ""}`}
      >
        <div>
          <Meta>{eyebrow}</Meta>
          <h1 className="mt-3 font-display text-headline">{title}</h1>
        </div>
        {action ? (
          <ButtonLink href={action.href}>{action.label}</ButtonLink>
        ) : null}
        {children ? (
          <div className="flex items-center gap-4">{children}</div>
        ) : null}
      </div>
    </header>
  );
}

const statusStyles: Record<ContentStatus, string> = {
  draft: "border-line-strong text-muted",
  published: "border-success/50 text-success",
  archived: "border-line text-muted line-through",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 font-label text-xs ${statusStyles[status]}`}
    >
      {STATUSES[status]}
    </span>
  );
}

export function AdminTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: { key: string; href: string; cells: ReactNode[] }[];
  empty: string;
}) {
  if (!rows.length) return <p className="mt-10 text-muted">{empty}</p>;
  return (
    <div className="mt-10 overflow-x-auto rounded-(--radius) border border-line">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="bg-surface-1 font-label text-xs text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-4 py-3 font-normal">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-surface-1">
              {row.cells.map((cell, index) => (
                <td
                  key={index}
                  className={`px-4 py-3 ${index ? "text-muted" : ""}`}
                >
                  {index === 0 ? (
                    <Link
                      href={row.href}
                      className="font-medium text-text underline-offset-4 hover:underline"
                    >
                      {cell}
                    </Link>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EditSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-line pt-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
      <div>
        <h2 className="font-display text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
