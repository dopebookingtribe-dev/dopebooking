import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  shortDate,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/dal";
import { formatCents } from "@/modules/marketplace/schemas";
import { requestWithdrawal, savePayoutDetails } from "@/modules/music/actions";
import { WithdrawalStatusBadge } from "@/modules/music/components/music-badges";
import {
  CancelWithdrawalButton,
  PayoutDetailsForm,
  WithdrawalForm,
} from "@/modules/music/components/release-forms";
import {
  getArtistBalance,
  getArtistEarnings,
  getMyArtists,
} from "@/modules/music/queries";
import { LEDGER_TYPES, MUSIC_CURRENCY } from "@/modules/music/schemas";

export const metadata: Metadata = { title: "Music earnings" };

export default function EarningsPage({
  searchParams,
}: PageProps<"/dashboard/music/earnings">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading earnings…</p>}>
        <Earnings searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Earnings({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard/music/earnings">["searchParams"];
}) {
  const user = await requireUser("/dashboard/music/earnings");
  const [artists, params] = await Promise.all([
    getMyArtists(user.id),
    searchParams,
  ]);
  const artist =
    artists.find((item) => item.id === params.artist) ?? artists[0];
  if (!artist) notFound();
  const [balance, earnings] = await Promise.all([
    getArtistBalance(artist.id),
    getArtistEarnings(artist.id),
  ]);
  const money = (cents: number) => formatCents(cents, MUSIC_CURRENCY);
  const open = earnings.withdrawals.find((w) =>
    ["requested", "approved"].includes(w.status),
  );

  return (
    <>
      <AdminHeader
        title="Earnings"
        eyebrow={artist.name}
        backHref="/dashboard/music"
        backLabel="My music"
      />

      <section
        aria-label="Balance"
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          ["Available", balance.available, "Ready to withdraw", "text-accent"],
          [
            "On hold",
            balance.pending,
            `New sales wait ${earnings.holdDays} days for refunds`,
            "",
          ],
          ["In payout", balance.in_withdrawal, "Requested, not paid yet", ""],
          ["Paid out", balance.withdrawn, "Sent to your bank", ""],
        ].map(([label, value, hint, tone]) => (
          <div
            key={label as string}
            className="rounded-(--radius) border border-line bg-surface-1 p-5"
          >
            <p className="font-label text-xs text-muted">{label}</p>
            <p className={`mt-2 font-display text-4xl ${tone}`}>
              {money(value as number)}
            </p>
            <p className="mt-1 text-xs text-muted">{hint}</p>
          </div>
        ))}
      </section>
      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Sales (what buyers paid)</dt>
          <dd>{money(balance.gross_sales)}</dd>
        </div>
        <div>
          <dt className="text-muted">Commission</dt>
          <dd>−{money(balance.commission)}</dd>
        </div>
        <div>
          <dt className="text-muted">Refunded</dt>
          <dd>−{money(balance.refunded)}</dd>
        </div>
        <div>
          <dt className="text-muted">Adjustments</dt>
          <dd>{money(balance.adjustments)}</dd>
        </div>
      </dl>

      <div className="mt-16 flex flex-col gap-16">
        <EditSection
          title="Get paid"
          description="We pay by bank transfer, usually within a few working days of approval."
        >
          <div className="flex flex-col gap-10">
            {open ? (
              <div className="rounded-(--radius) border border-line bg-surface-1 p-5">
                <p>
                  Payout {open.reference} for {money(open.amount)} is{" "}
                  <WithdrawalStatusBadge status={open.status} />
                </p>
                {open.status === "requested" ? (
                  <CancelWithdrawalButton withdrawalId={open.id} />
                ) : null}
              </div>
            ) : earnings.payout ? (
              <WithdrawalForm
                available={balance.available}
                minimum={earnings.minWithdrawal}
                currency={MUSIC_CURRENCY}
                action={requestWithdrawal.bind(null, artist.id)}
              />
            ) : (
              <p className="text-sm text-muted">
                Add your bank details below to request payouts.
              </p>
            )}
            <div>
              <h3 className="font-medium">Bank details</h3>
              <p className="mt-1 text-sm text-muted">
                Only you, your team and our finance staff can see these.
              </p>
              <div className="mt-5">
                <PayoutDetailsForm
                  details={earnings.payout}
                  action={savePayoutDetails.bind(null, artist.id)}
                />
              </div>
            </div>
          </div>
        </EditSection>

        <EditSection
          title="Sales by release"
          description="Copies sold since you joined, before refunds."
        >
          {earnings.sales.length ? (
            <table className="w-full text-left text-sm">
              <thead className="font-label text-xs text-muted">
                <tr>
                  <th scope="col" className="py-2 font-normal">
                    Release
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Sold
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Sales
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Your share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-y border-line">
                {earnings.sales.map((row) => (
                  <tr key={row.title}>
                    <td className="py-2">{row.title}</td>
                    <td className="py-2 text-right tabular-nums">
                      {row.count}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.gross)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">No sales yet.</p>
          )}
        </EditSection>

        <EditSection
          title="History"
          description="Every movement in your balance. Nothing is ever edited or deleted."
        >
          {earnings.ledger.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="font-label text-xs text-muted">
                  <tr>
                    <th scope="col" className="py-2 font-normal">
                      Date
                    </th>
                    <th scope="col" className="py-2 font-normal">
                      What
                    </th>
                    <th scope="col" className="py-2 text-right font-normal">
                      Amount
                    </th>
                    <th scope="col" className="py-2 text-right font-normal">
                      Available from
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-y border-line">
                  {earnings.ledger.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2 whitespace-nowrap text-muted">
                        {shortDate(entry.created_at)}
                      </td>
                      <td className="py-2">
                        {LEDGER_TYPES[entry.entry_type]}
                        {entry.note ? (
                          <span className="block text-xs text-muted">
                            {entry.note}
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${entry.amount < 0 ? "text-muted" : "text-success"}`}
                      >
                        {entry.amount > 0 ? "+" : ""}
                        {money(entry.amount)}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap text-muted">
                        {entry.entry_type === "sale"
                          ? shortDate(entry.available_at)
                          : "—"}
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

        <EditSection
          title="Payouts"
          description="Your payout requests and their bank references."
        >
          {earnings.withdrawals.length ? (
            <ul className="divide-y divide-line border-y border-line text-sm">
              {earnings.withdrawals.map((withdrawal) => (
                <li
                  key={withdrawal.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span>
                    {withdrawal.reference} ·{" "}
                    {shortDate(withdrawal.requested_at)}
                    {withdrawal.payout_reference ? (
                      <span className="block text-xs text-muted">
                        Bank reference {withdrawal.payout_reference}
                      </span>
                    ) : null}
                    {withdrawal.admin_note ? (
                      <span className="block text-xs text-muted">
                        {withdrawal.admin_note}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">
                      {money(withdrawal.amount)}
                    </span>
                    <WithdrawalStatusBadge status={withdrawal.status} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No payouts yet.</p>
          )}
        </EditSection>
      </div>
    </>
  );
}
