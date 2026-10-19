import { expect, test } from "@playwright/test";

test("home page renders the hero and primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "dancefloor",
  );
  await expect(
    page.getByRole("main").getByRole("link", { name: "Book an artist" }),
  ).toBeVisible();
});

test("signed-out visitors are sent from the dashboard to sign in", async ({
  page,
}) => {
  await page.goto("/dashboard/orders");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Forders$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("admin is guarded too", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
});

test("login form validates input on the server", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
});

test("security headers are set", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
});

test("mobile menu covers the screen and closes with Escape", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /menu|close/i });
  // Retry until hydration has attached the click handler.
  await expect(async () => {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "true", {
      timeout: 500,
    });
  }).toPass();

  const panelId = await toggle.getAttribute("aria-controls");
  const panel = page.locator(`[id="${panelId}"]`);
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.height).toBeGreaterThan((viewport?.height ?? 0) * 0.8);
  await expect(panel.getByRole("link", { name: "Artists" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("artist directory renders", async ({ page }) => {
  await page.goto("/artists");
  await expect(
    page.getByRole("heading", { level: 1, name: "Artists" }),
  ).toBeVisible();
});

test("unknown artist shows the not-found page", async ({ page }) => {
  await page.goto("/artists/this-artist-does-not-exist");
  await expect(
    page.getByText("This page took a different stage."),
  ).toBeVisible();
});
