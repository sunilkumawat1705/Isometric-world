import { test, expect } from "@playwright/test";
test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  deviceScaleFactor: 2,
});
test("retina touch tablet has usable controls and bounded render resolution", async ({
  page,
}) => {
  await page.goto("/");
  const explore = page.getByRole("button", {
    name: "Explore the village",
    exact: true,
  });
  await expect(explore).toBeEnabled({ timeout: 45000 });
  await explore.tap();
  const joystick = page.getByRole("group", { name: "Movement joystick" });
  await expect(joystick).toBeVisible();
  expect((await joystick.boundingBox())!.width).toBeGreaterThanOrEqual(84);
  expect(
    (await page
      .getByRole("button", { name: "Jump", exact: true })
      .boundingBox())!.width,
  ).toBeGreaterThanOrEqual(44);
  const ratio = await page
    .locator("canvas")
    .evaluate(
      (canvas) => (canvas as HTMLCanvasElement).width / canvas.clientWidth,
    );
  expect(ratio).toBeLessThanOrEqual(1.51);
  await page.getByRole("button", { name: "Jump", exact: true }).tap();
  await expect
    .poll(() => page.getByLabel("Player status").getAttribute("data-state"), {
      timeout: 3000,
    })
    .toMatch(/jump|fall/);
  await page.getByRole("button", { name: "First-person", exact: true }).tap();
  await expect(
    page.getByRole("button", { name: "First-person", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(joystick).toBeVisible();
  await page.screenshot({ path: "output/playwright/touch-tablet-fpv.png" });
});
