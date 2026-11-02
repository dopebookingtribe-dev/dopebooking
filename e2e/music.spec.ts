import { expect, test } from "@playwright/test";

test("music store renders", async ({ page }) => {
  await page.goto("/music");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Music");
  // Either the catalogue with its search, or the friendly empty state.
  await expect(
    page
      .getByRole("search")
      .or(page.getByRole("heading", { name: /first releases/i })),
  ).toBeVisible();
});

test("unknown release shows the not-found page", async ({ page }) => {
  await page.goto("/music/nobody/nothing-here");
  await expect(
    page.getByText("This page took a different stage."),
  ).toBeVisible();
});

for (const path of ["/legal/music-license", "/legal/music-seller-terms"]) {
  test(`${path} renders`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("music dashboards are protected", async ({ page }) => {
  for (const path of [
    "/dashboard/music",
    "/dashboard/music/earnings",
    "/dashboard/library",
    "/admin/music",
    "/admin/music/finance",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test("downloads need a real purchase", async ({ request }) => {
  const fake = "9b2f1c3e-8a4d-4f6b-9c1e-2d3a4b5c6d7e";
  for (const query of [
    "",
    "?e=x&f=y",
    `?e=${fake}&f=${fake}`,
    `?e=${fake}&f=${fake}&t=guess`,
  ]) {
    const response = await request.get(`/api/music/download${query}`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(404);
  }
});

test("cart drops unknown music instead of trusting the browser", async ({
  page,
}) => {
  await page.goto("/cart");
  await page.evaluate(() =>
    localStorage.setItem(
      "dopebooking.music-cart.v1",
      JSON.stringify(["9b2f1c3e-8a4d-4f6b-9c1e-2d3a4b5c6d7e"]),
    ),
  );
  await page.reload();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("dopebooking.music-cart.v1")),
    )
    .toBe("[]");
});
