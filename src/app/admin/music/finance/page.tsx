import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  shortDate,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { formatCents } from "@/modules/marketplace/schemas";
import {
  addAdjustment,
  decideWithdrawal,
  saveMusicSettings,
} from "@/modules/music/admin-actions";
import {
  getFinanceOverview,
  getMusicSettings,
} from "@/modules/music/admin-queries";
import {
  AdjustmentForm,
  MusicSettingsForm,
  WithdrawalDecisionForm,
} from "@/modules/music/components/admin-forms";
import { MusicAdminNav } from "@/modules/music/components/music-admin-nav";
import { WithdrawalStatusBadge } from "@/modules/music/components/music-badges";
import { LEDGER_TYPES, MUSIC_CURRENCY } from "@/modules/music/schemas";

export const metadata: Metadata = { title: "Music finance" };

export default function MusicFinancePage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Finance & payouts" eyebrow="Music" />
      <MusicAdminNav current="/admin/music/finance" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Finance />
      </Suspense>
    </Container>
  );
}

/** Short form for the summary line; the full IBAN sits behind the toggle. */
function maskIban(iban: string) {
  return `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;
}

async function Finance() {
  await requirePermission("finance.manage", "/admin/music/finance");
  const [overview, settings] = await Promise.all([
    getFinanceOverview(),
    getMusicSettings(),
  ]);
  const money = (cents: number) => formatCents(cents, MUSIC_CURRENCY);
  const { totals } = overview;

  return (
    <div className="mt-10 flex flex-col gap-16">
      <section
        aria-label="Totals"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[
          ["Music sales", totals.gross, "What buyers paid, before refunds"],
          [
            "Platform commission",
            totals.commission,
            "After refunds; Stripe fees come out of this",
          ],
          [
            "Owed to artists",
            totals.owed,
            "Pending + available + requested payouts",
          ],
          ["Artists' share earned", totals.artistShare, "Before refunds"],
          ["Refunded", totals.refunded, "Gross amount given back"],
          ["Paid out", totals.paidOut, "Bank transfers recorded"],
        ].map(([label, value, hint]) => (
          <div
            key={label as string}
            className="rounded-(--radius) border border-line bg-surface-1 p-5"
          >
            <p className="font-label text-xs text-muted">{label}</p>
            <p className="mt-2 font-display text-4xl">
              {money(value as number)}
            </p>
            <p className="mt-1 text-xs text-muted">{hint}</p>
          </div>
        ))}
      </section>

      <EditSection
        title="Payout requests"
        description="Approve, send the bank transfer yourself, then mark it paid with the transfer reference. Rejecting returns the money to the artist's balance."
      >
        {overview.queue.length ? (
          <ul className="flex flex-col gap-6">
            {overview.queue.map((withdrawal) => (
              <li
                key={withdrawal.id}
                className="rounded-(--radius) border border-line bg-surface-1 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p>
                    <span className="font-medium">{withdrawal.artistName}</span>{" "}
                    <span className="text-muted">
                      · {withdrawal.reference} ·{" "}
                      {shortDate(withdrawal.requested_at)}
                    </span>
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="font-display text-2xl">
                      {money(withdrawal.amount)}
                    </span>
                    <WithdrawalStatusBadge status={withdrawal.status} />
                  </p>
                </div>
                {withdrawal.payout ? (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-muted">
                      Bank: {withdrawal.payout.account_holder},{" "}
                      {maskIban(withdrawal.payout.iban)}
                    </summary>
                    <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-y-1 font-label text-xs">
                      <dt className="text-muted">Account holder</dt>
                      <dd>{withdrawal.payout.account_holder}</dd>
                      <dt className="text-muted">IBAN</dt>
                      <dd className="select-all">
                        {withdrawal.payout.iban
                          .replace(/(.{4})/g, "$1 ")
                          .trim()}
                      </dd>
                      {withdrawal.payout.bic ? (
                        <>
                          <dt className="text-muted">BIC</dt>
                          <dd className="select-all">
                            {withdrawal.payout.bic}
                          </dd>
                        </>
                      ) : null}
                      <dt className="text-muted">Reference to use</dt>
                      <dd className="select-all">{withdrawal.reference}</dd>
                    </dl>
                  </details>
                ) : (
                  <p className="mt-3 text-sm text-danger">
                    No bank details on file.
                  </p>
                )}
                <div className="mt-4">
                  <WithdrawalDecisionForm
                    action={decideWithdrawal.bind(null, withdrawal.id)}
                    status={withdrawal.status as "requested" | "approved"}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No open payout requests.</p>
        )}
      </EditSection>

      <EditSection title="Artist balances" description="Live from the ledger.">
        {overview.balances.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="font-label text-xs text-muted">
                <tr>
                  {[
                    "Artist",
                    "Sales",
                    "Commission",
                    "Refunded",
                    "On hold",
                    "Available",
                    "Paid out",
                  ].map((label, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={`py-2 font-normal ${index ? "text-right" : ""}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-y border-line">
                {overview.balances.map((row) => (
                  <tr key={row.artistId}>
                    <td className="py-2">{row.name}</td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.gross_sales)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.commission)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.refunded)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.pending)}
                    </td>
                    <td className="py-2 text-right text-accent tabular-nums">
                      {money(row.available)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.withdrawn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No music sales yet.</p>
        )}
      </EditSection>

      <EditSection
        title="Adjustments"
        description="Corrections such as a goodwill credit or a chargeback. Use a minus for deductions. Recorded in the ledger and the audit log."
      >
        <AdjustmentForm
          artists={overview.artists}
          actions={Object.fromEntries(
            overview.artists.map((artist) => [
              artist.id,
              addAdjustment.bind(null, artist.id),
            ]),
          )}
        />
      </EditSection>

      <EditSection
        title="Settings"
        description="Commission, hold period and minimum payout for music."
      >
        <MusicSettingsForm action={saveMusicSettings} settings={settings} />
      </EditSection>

      <EditSection title="Recent ledger entries" description="Newest first.">
        {overview.recent.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="font-label text-xs text-muted">
                <tr>
                  <th scope="col" className="py-2 font-normal">
                    Date
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    Artist
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    What
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Gross
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Artist amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-y border-line">
                {overview.recent.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2 whitespace-nowrap text-muted">
                      {shortDate(entry.created_at)}
                    </td>
                    <td className="py-2">{entry.artistName}</td>
                    <td className="py-2">
                      {LEDGER_TYPES[entry.entry_type]}
                      {entry.note ? (
                        <span className="block text-xs text-muted">
                          {entry.note}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {entry.gross_amount ? money(entry.gross_amount) : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">Nothing yet.</p>
        )}
      </EditSection>

      {overview.history.length ? (
        <EditSection
          title="Closed payouts"
          description="Paid, rejected and cancelled requests."
        >
          <ul className="divide-y divide-line border-y border-line text-sm">
            {overview.history.map((withdrawal) => (
              <li
                key={withdrawal.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span>
                  {withdrawal.artistName} · {withdrawal.reference} ·{" "}
                  {shortDate(withdrawal.requested_at)}
                  {withdrawal.payout_reference ? (
                    <span className="block text-xs text-muted">
                      Bank ref {withdrawal.payout_reference}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3">
                  {money(withdrawal.amount)}
                  <WithdrawalStatusBadge status={withdrawal.status} />
                </span>
              </li>
            ))}
          </ul>
        </EditSection>
      ) : null}
    </div>
  );
}
