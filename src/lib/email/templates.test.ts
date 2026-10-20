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

  it("ignores unknown templates", () => {
    expect(renderEmail("nope", {}, site)).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("escapes quotes and angle brackets", () => {
    expect(escapeHtml(`"<a>'&`)).toBe("&quot;&lt;a&gt;&#39;&amp;");
  });
});
