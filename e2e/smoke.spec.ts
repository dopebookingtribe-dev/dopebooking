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

for (const [path, heading] of [
  ["/events", "Events"],
  ["/gallery", "Photos"],
  ["/videos", "Videos"],
] as const) {
  test(`${path} renders`, async ({ page }) => {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
  });
}

test("admin sections are guarded", async ({ page }) => {
  for (const path of ["/admin/events", "/admin/galleries", "/admin/videos"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test("booking pages are protected", async ({ page, request }) => {
  await page.goto("/dashboard/bookings");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fbookings$/);
  await page.goto("/admin/bookings");
  await expect(page).toHaveURL(/\/login\?next=/);

  const cron = await request.get("/api/cron/email");
  expect(cron.status()).toBe(401);
});

test("booking an unknown artist shows not found", async ({ page }) => {
  await page.goto("/book/this-artist-does-not-exist");
  await expect(
    page.getByText("This page took a different stage."),
  ).toBeVisible();
});

test("services overview links to each offer", async ({ page }) => {
  await page.goto("/services");
  for (const name of [
    "Event promotion",
    "Festival catering",
    "Photo, video & aftermovies",
  ]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await page.getByRole("link", { name: /Festival catering/ }).click();
  await expect(page).toHaveURL(/\/services\/catering$/);
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toHaveAttribute("href", "/signup?next=%2Fservices%2Fcatering");
});

test("service request pages are protected", async ({ page }) => {
  await page.goto("/dashboard/requests");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Frequests$/);
  for (const path of ["/admin/services", "/admin/providers"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test("unknown service offer is not found", async ({ page }) => {
  await page.goto("/services/teleportation");
  await expect(
    page.getByText("This page took a different stage."),
  ).toBeVisible();
});

test("shop, sell and empty cart render", async ({ page }) => {
  await page.goto("/shop");
  await expect(
    page.getByRole("heading", { level: 1, name: "Shop" }),
  ).toBeVisible();
  await page.goto("/sell");
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toHaveAttribute("href", "/signup?next=%2Fsell");
  await page.goto("/cart");
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});

test("cart drops unknown items instead of trusting the browser", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "dopebooking.cart.v1",
      JSON.stringify([
        { variantId: "3f1c1c9e-6c55-4a8a-9d4e-1f7f0a2b3c4d", quantity: 2 },
      ]),
    ),
  );
  await page.goto("/cart");
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});

test("seller and marketplace admin pages are protected", async ({ page }) => {
  await page.goto("/dashboard/seller");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fseller$/);
  await page.goto("/admin/sellers");
  await expect(page).toHaveURL(/\/login\?next=/);
});
