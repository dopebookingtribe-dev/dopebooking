import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Automated WCAG 2.1 AA checks on key public pages. Fails on serious or
// critical issues; manual testing (keyboard, screen reader) still matters.
const PAGES = [
  "/",
  "/artists",
  "/events",
  "/gallery",
  "/videos",
  "/services",
  "/services/production",
  "/shop",
  "/sell",
  "/cart",
  "/login",
  "/signup",
  "/legal/privacy",
];

for (const path of PAGES) {
  test(`no serious accessibility issues on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(
      serious.map((violation) => ({
        id: violation.id,
        help: violation.help,
        targets: violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" ")),
      })),
    ).toEqual([]);
  });
}
