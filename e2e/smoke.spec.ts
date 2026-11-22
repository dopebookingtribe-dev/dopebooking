import { expect, test } from "@playwright/test";

test("home page renders the hero and primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "psytrance artists",
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
  await expect(
    panel.getByRole("link", { name: "Artists", exact: true }),
  ).toBeVisible();

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
  await page
    .getByRole("main")
    .getByRole("link", { name: /Festival catering/ })
    .click();
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

test("payments stay off safely until Stripe is configured", async ({
  page,
  request,
}) => {
  // Webhook refuses without configuration (CI has no Stripe keys).
  const webhook = await request.post("/api/webhooks/stripe", { data: "{}" });
  expect([400, 503]).toContain(webhook.status());

  await page.goto(
    "/checkout/success?order=00000000-0000-0000-0000-000000000000&token=nope",
  );
  await expect(
    page.getByRole("heading", { name: "Order not found" }),
  ).toBeVisible();

  await page.goto("/orders/00000000-0000-0000-0000-000000000000?token=nope");
  await expect(
    page.getByText("This page took a different stage."),
  ).toBeVisible();
});

test("order pages are protected", async ({ page }) => {
  for (const path of [
    "/dashboard/orders",
    "/dashboard/seller/orders",
    "/admin/orders",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test("content management and previews are guarded", async ({ page }) => {
  for (const path of [
    "/admin/pages",
    "/admin/pages/home",
    "/admin/settings",
    "/admin/media",
    "/admin/users",
    "/admin/audit",
    "/admin/demo",
    "/admin/categories",
    "/admin/products",
    "/admin/products/new",
    "/admin/posts",
    "/admin/posts/new",
    "/admin/legal",
    "/admin/legal/imprint",
    "/admin/media/00000000-0000-0000-0000-000000000000",
    "/admin/music/new",
    "/admin/videos/new",
    "/preview/home",
  ]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login\?next=/);
  }
});

test("news page renders", async ({ page }) => {
  await page.goto("/news");
  await expect(
    page.getByRole("heading", { level: 1, name: "News" }),
  ).toBeVisible();
});

test("about page and editable pages render", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/services/catering");
  await expect(
    page.getByRole("heading", { name: "Request a quote" }),
  ).toBeVisible();
});

test("unknown preview pages are not found for visitors", async ({
  request,
}) => {
  const response = await request.get("/admin/pages/not-a-page", {
    maxRedirects: 0,
  });
  expect([307, 404]).toContain(response.status());
});

test.describe("Art Gallery", () => {
  for (const [path, heading] of [
    ["/art-gallery", /Art that lives inside the festival/],
    ["/art-gallery/exhibitions", "Exhibitions"],
    ["/art-gallery/artists", "Artists"],
    ["/art-gallery/collaborate", "Collaborate with us"],
  ] as const) {
    test(`${path} renders`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
    });
  }

  test("is in the main navigation", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(
      footer.getByRole("link", { name: "Art Gallery" }),
    ).toHaveAttribute("href", "/art-gallery");
  });

  test("collaboration inquiries need an account", async ({ page }) => {
    await page.goto("/art-gallery/collaborate");
    await expect(
      page.getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", /\/signup\?next=%2Fart-gallery%2Fcollaborate/);
  });

  test("unknown art pages are not found", async ({ page }) => {
    for (const path of [
      "/art-gallery/artists/nobody-here",
      "/art-gallery/exhibitions/never-happened",
      "/art-gallery/works/not-a-work",
    ]) {
      await page.goto(path);
      await expect(
        page.getByText("This page took a different stage."),
        path,
      ).toBeVisible();
    }
  });

  test("admin is guarded", async ({ page }) => {
    for (const path of [
      "/admin/art",
      "/admin/art/artists",
      "/admin/art/exhibitions",
      "/admin/art/artworks",
      "/admin/art/festivals",
      "/admin/art/inquiries",
      "/preview/art-gallery",
    ]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login\?next=/);
    }
  });
});
