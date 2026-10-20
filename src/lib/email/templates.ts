// Plain, accessible transactional emails (HTML + text). Payloads come from the
// database outbox; everything is escaped before it reaches HTML.

type Payload = Record<string, unknown>;
export type RenderedEmail = { subject: string; html: string; text: string };

const STATUS_TEXT: Record<string, string> = {
  under_review: "is being reviewed by our booking team",
  quoted: "has a quote waiting for you",
  negotiating: "is in negotiation",
  confirmed: "is confirmed",
  completed: "is completed. Thank you!",
  declined: "could not be confirmed this time",
  cancelled: "has been cancelled",
  expired: "has expired",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const str = (payload: Payload, key: string) =>
  typeof payload[key] === "string" ? (payload[key] as string) : "";

function money(payload: Payload) {
  const amount = payload.quote_amount;
  if (typeof amount !== "number") return "";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: str(payload, "quote_currency") || "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function layout(
  siteUrl: string,
  heading: string,
  lines: string[],
  link: string,
  cta: string,
) {
  // Only paths on our own site; anything else falls back to the dashboard.
  const path = /^\/(?!\/)/.test(link) ? link : "/dashboard";
  const url = new URL(path, siteUrl).toString();
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#0a0a0c;color:#f3f0ea;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px">
<tr><td style="font-family:Georgia,serif;font-size:24px;padding-bottom:24px">DopeBooking</td></tr>
<tr><td style="font-family:Georgia,serif;font-size:30px;line-height:1.15;padding-bottom:16px">${escapeHtml(heading)}</td></tr>
${lines.map((line) => `<tr><td style="font-size:16px;line-height:1.6;color:#d8d5de;padding-bottom:12px;white-space:pre-line">${escapeHtml(line)}</td></tr>`).join("")}
<tr><td style="padding:16px 0 32px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#c6f432;color:#0a0a0c;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">${escapeHtml(cta)}</a></td></tr>
<tr><td style="font-size:12px;color:#a6a3ad;border-top:1px solid #2a2a33;padding-top:16px">You get this email because of activity on your DopeBooking account.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    heading,
    "",
    ...lines,
    "",
    `${cta}: ${url}`,
    "",
    "— DopeBooking",
  ].join("\n");
  return { html, text };
}

export function renderEmail(
  template: string,
  payload: Payload,
  siteUrl: string,
): RenderedEmail | null {
  const ref = str(payload, "reference");
  const artist = str(payload, "artist");
  const event = str(payload, "event_name");
  const link = str(payload, "link");
  const note = str(payload, "note");

  switch (template) {
    case "booking_received": {
      const body = layout(
        siteUrl,
        `We've got your request for ${artist}`,
        [
          `Reference ${ref} · ${event}, ${str(payload, "city")} (${str(payload, "event_date")}).`,
          "Our booking team will check availability and reply with a quote, usually within 2 working days.",
        ],
        link,
        "View your request",
      );
      return { subject: `Booking request ${ref} received`, ...body };
    }
    case "booking_new_staff": {
      const body = layout(
        siteUrl,
        `New request: ${artist}`,
        [
          `${event}, ${str(payload, "city")} (${str(payload, "event_date")}). Reference ${ref}.`,
        ],
        link,
        "Open in admin",
      );
      return { subject: `New booking request: ${artist} (${ref})`, ...body };
    }
    case "booking_status": {
      const status = str(payload, "status");
      const lines = [
        `Your request for ${artist} (${event}) ${STATUS_TEXT[status] ?? "was updated"}.`,
      ];
      if (status === "quoted" && money(payload))
        lines.push(`Quote: ${money(payload)}`);
      if (note) lines.push(note);
      const body = layout(
        siteUrl,
        `Booking ${ref}: update`,
        lines,
        link,
        "View details",
      );
      return {
        subject: `Booking ${ref}: ${status.replace(/_/g, " ")}`,
        ...body,
      };
    }
    case "booking_status_staff": {
      const body = layout(
        siteUrl,
        `Booking ${ref} cancelled`,
        [
          `The requester cancelled ${artist} for ${event}.`,
          ...(note ? [note] : []),
        ],
        link,
        "Open in admin",
      );
      return { subject: `Booking ${ref} cancelled by requester`, ...body };
    }
    case "booking_message":
    case "booking_message_staff": {
      const staff = template.endsWith("_staff");
      const body = layout(
        siteUrl,
        staff ? `Reply on booking ${ref}` : `New message about booking ${ref}`,
        [str(payload, "excerpt")],
        link,
        "Read and reply",
      );
      return {
        subject: staff
          ? `Reply on ${ref}`
          : `Message about your booking ${ref}`,
        ...body,
      };
    }
    case "service_received": {
      const body = layout(
        siteUrl,
        `We've got your ${str(payload, "service").toLowerCase()} request`,
        [
          `Reference ${ref} · ${event}, ${str(payload, "city")} (${str(payload, "event_date")}).`,
          "We'll review it and reply with a quote, usually within 2 working days.",
        ],
        link,
        "View your request",
      );
      return { subject: `Request ${ref} received`, ...body };
    }
    case "service_new_staff": {
      const body = layout(
        siteUrl,
        `New request: ${str(payload, "service")}`,
        [
          `${event}, ${str(payload, "city")} (${str(payload, "event_date")}). Reference ${ref}.`,
        ],
        link,
        "Open in admin",
      );
      return {
        subject: `New ${str(payload, "service").toLowerCase()} request (${ref})`,
        ...body,
      };
    }
    case "service_status": {
      const status = str(payload, "status");
      const lines = [
        `Your ${str(payload, "service").toLowerCase()} request for ${event} ${STATUS_TEXT[status] ?? "was updated"}.`,
      ];
      if (status === "quoted" && money(payload)) {
        lines.push(
          `Quote: ${money(payload)}. You can accept it from your dashboard.`,
        );
      }
      if (note) lines.push(note);
      const body = layout(
        siteUrl,
        `Request ${ref}: update`,
        lines,
        link,
        "View details",
      );
      return {
        subject: `Request ${ref}: ${status.replace(/_/g, " ")}`,
        ...body,
      };
    }
    case "service_status_staff": {
      const status = str(payload, "status");
      const body = layout(
        siteUrl,
        `Request ${ref} ${status === "accepted" ? "accepted" : "cancelled"}`,
        [
          status === "accepted"
            ? `The requester accepted the quote for ${event}. Confirm it to go ahead.`
            : `The requester cancelled ${event}.`,
        ],
        link,
        "Open in admin",
      );
      return { subject: `Request ${ref}: ${status} by requester`, ...body };
    }
    case "service_message":
    case "service_message_staff": {
      const staff = template.endsWith("_staff");
      const body = layout(
        siteUrl,
        staff ? `Reply on request ${ref}` : `New message about request ${ref}`,
        [str(payload, "excerpt")],
        link,
        "Read and reply",
      );
      return {
        subject: staff
          ? `Reply on ${ref}`
          : `Message about your request ${ref}`,
        ...body,
      };
    }
    case "order_paid": {
      const total =
        typeof payload.total === "number"
          ? new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: str(payload, "currency") || "EUR",
            }).format(payload.total / 100)
          : "";
      const body = layout(
        siteUrl,
        "Thanks for your order",
        [
          `Order ${ref}${total ? ` · ${total}` : ""} is confirmed.`,
          "Each seller ships their items separately; downloads are ready on your order page.",
        ],
        link,
        "View your order",
      );
      return { subject: `Order ${ref} confirmed`, ...body };
    }
    case "order_new_seller": {
      const body = layout(
        siteUrl,
        "You have a new order",
        [
          `Order ${ref} is paid. Please prepare it and add tracking when it ships.`,
        ],
        link,
        "Open the order",
      );
      return { subject: `New order ${ref}`, ...body };
    }
    case "order_shipped": {
      const tracking = [str(payload, "carrier"), str(payload, "tracking")]
        .filter(Boolean)
        .join(" · ");
      const body = layout(
        siteUrl,
        "Your order is on its way",
        [
          `Part of order ${ref} has shipped.`,
          ...(tracking ? [`Tracking: ${tracking}`] : []),
        ],
        link,
        "View your order",
      );
      return { subject: `Order ${ref} shipped`, ...body };
    }
    default:
      return null;
  }
}
