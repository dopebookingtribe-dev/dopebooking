import { describe, expect, it } from "vitest";
import { escapeHtml, renderEmail } from "./templates";

const site = "https://dopebooking.example";

describe("renderEmail", () => {
  it("renders a quote update with an absolute link", () => {
    const email = renderEmail(
      "booking_status",
      {
        reference: "BK-1A2B3C4D",
        artist: "Vini Vici",
        event_name: "Forest Gathering",
        status: "quoted",
        quote_amount: 2500,
        quote_currency: "EUR",
        link: "/dashboard/bookings/abc",
      },
      site,
    );
    expect(email?.subject).toBe("Booking BK-1A2B3C4D: quoted");
    expect(email?.text).toContain("€2,500");
    expect(email?.text).toContain(`${site}/dashboard/bookings/abc`);
    expect(email?.html).toContain(`href="${site}/dashboard/bookings/abc"`);
  });

  it("escapes user-provided text", () => {
    const email = renderEmail(
      "booking_message",
      { reference: "BK-1", excerpt: '<script>alert("x")</script>', link: "/x" },
      site,
    );
    expect(email?.html).not.toContain("<script>");
    expect(email?.html).toContain("&lt;script&gt;");
  });

  it("keeps links on our own site", () => {
    const email = renderEmail(
      "booking_received",
      { reference: "BK-1", link: "https://evil.example/phish" },
      site,
    );
    expect(email?.html).not.toContain("evil.example");
    expect(email?.text).toContain(`${site}/dashboard`);
    const protocolRelative = renderEmail(
      "booking_received",
      { reference: "BK-1", link: "//evil.example/x" },
      site,
    );
    expect(protocolRelative?.html).not.toContain("evil.example");
  });

  it("renders service request templates", () => {
    const email = renderEmail(
      "service_status",
      {
        reference: "SR-1",
        service: "Festival catering",
        event_name: "Forest Gathering",
        status: "quoted",
        quote_amount: 4800,
        quote_currency: "EUR",
        link: "/dashboard/requests/abc",
      },
      site,
    );
    expect(email?.text).toContain("festival catering request");
    expect(email?.text).toContain("accept it");
    expect(
      renderEmail(
        "service_status_staff",
        { status: "accepted", link: "/x" },
        site,
      )?.subject,
    ).toContain("accepted");
  });

  it("renders order emails", () => {
    const paid = renderEmail(
      "order_paid",
      {
        reference: "OR-1",
        total: 8889,
        currency: "EUR",
        link: "/orders/x?token=abc",
      },
      site,
    );
    expect(paid?.text).toContain("€88.89");
    expect(paid?.text).toContain(`${site}/orders/x?token=abc`);
    expect(
      renderEmail(
        "order_shipped",
        { reference: "OR-1", carrier: "DHL", tracking: "123", link: "/d" },
        site,
      )?.text,
    ).toContain("DHL · 123");
  });

  it("ignores unknown templates", () => {
    expect(renderEmail("nope", {}, site)).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("escapes quotes and angle brackets", () => {
    expect(escapeHtml(`"<a>'&`)).toBe("&quot;&lt;a&gt;&#39;&amp;");
  });
});
