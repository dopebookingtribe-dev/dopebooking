export const CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "BRL",
  "ILS",
  "INR",
  "AUD",
];

/** Friendly text for errors raised by the workflow database functions. */
export function workflowErrorMessage(error: {
  message?: string;
  code?: string;
}) {
  const text = error.message ?? "";
  if (text.includes("rate_limited")) {
    return "You've sent a lot in the last hour. Please try again later.";
  }
  if (text.includes("invalid_transition")) {
    return "That step isn't possible from the current status. Refresh the page.";
  }
  if (text.includes("quote_required")) return "Enter the quote amount.";
  if (error.code === "42501" || text.includes("forbidden")) {
    return "You can't do that for this request.";
  }
  return "Something went wrong. Please try again.";
}

export function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency ?? "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDay(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
