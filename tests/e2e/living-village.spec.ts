import { expect, test } from "@playwright/test";

test("local clock changes the village between daylight and moonlit night", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const [hour, period] of [
    [12, "Day"],
    [0, "Night"],
  ] as const) {
    await page.clock.setFixedTime(
      new Date(2026, 9, hour === 0 ? 26 : 11, hour),
    );
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Explore the village", exact: true }),
    ).toBeEnabled({ timeout: 45000 });
    await expect(page.getByTestId("world-clock")).toHaveAttribute(
      "data-period",
      period,
    );
    await page.screenshot({
      path: `output/playwright/village-${period.toLowerCase()}.png`,
    });
  }
  expect(errors).toEqual([]);
});

test("entrance spawn and readable signs lead across the bridge; water blocks shortcuts", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  const start = page.getByRole("button", {
    name: "Explore the village",
    exact: true,
  });
  await expect(start).toBeEnabled({ timeout: 45000 });
  await expect(
    page.locator(".village-sign-caption, .world-label, .building-seal"),
  ).toHaveCount(0);
  await start.click();
  const status = page.getByLabel("Player status");
  const x = async () => Number(await status.getAttribute("data-x"));
  const z = async () => Number(await status.getAttribute("data-z"));
  async function down(keys: string[]) {
    for (const key of keys) await page.keyboard.down(key);
  }
  async function up(keys: string[]) {
    for (const key of keys) await page.keyboard.up(key);
  }
  expect(await x()).toBeCloseTo(1, 0);
  expect(await z()).toBeCloseTo(24, 0);
  await expect(
    page.getByRole("note", { name: "Nearby village sign" }),
  ).toContainText("Forest Village");
  await expect(page.locator(".village-sign-caption")).toHaveCount(1);
  await page.screenshot({
    path: "output/playwright/village-entrance-sign.png",
  });
  await down(["w", "d"]);
  await expect.poll(z, { timeout: 30000 }).toBeLessThan(5.5);
  await up(["w", "d"]);
  await expect(
    page
      .getByRole("note", { name: "Nearby village sign" })
      .filter({ hasText: "Forest Village" }),
  ).toHaveCount(0);
  await down(["w", "a"]);
  await expect.poll(x, { timeout: 10000 }).toBeLessThan(-3);
  await up(["w", "a"]);
  // Exercise the real projected nearby records popup, with no physical board.
  await page
    .getByRole("button", { name: "Open Village records", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Village leaderboard" }),
  ).toBeVisible();
  await expect(page.locator(".village-sign-caption")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open Village records", exact: true }),
  ).toBeVisible();
  await down(["s", "a"]);
  await expect.poll(z, { timeout: 15000 }).toBeGreaterThan(9);
  await page.waitForTimeout(1500);
  const bankZ = await z();
  await page.keyboard.press("Space");
  await page.waitForTimeout(1500);
  expect(await z()).toBeLessThan(bankZ + 0.25);
  await up(["s", "a"]);
  // Start again to approach the bridge on its centreline; this avoids
  // keyboard-event latency making a timed sideways approach overshoot.
  await page.reload();
  await expect(start).toBeEnabled({ timeout: 45000 });
  await start.click();
  await down(["w", "d"]);
  await expect.poll(z, { timeout: 30000 }).toBeLessThan(8);
  await up(["w", "d"]);
  expect(await x()).toBeGreaterThan(-0.2);
  expect(await x()).toBeLessThan(2.2);
  expect(Number(await status.getAttribute("data-y"))).toBeGreaterThan(0.65);
  await page.screenshot({
    path: "output/playwright/village-entrance-crossing.png",
  });
});
