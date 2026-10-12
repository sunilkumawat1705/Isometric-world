import { test, expect } from "@playwright/test";
test("high graphics compile and first-person camera survives view changes", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const explore = page.getByRole("button", {
    name: "Explore the village",
    exact: true,
  });
  await expect(explore).toBeEnabled({ timeout: 45000 });
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await expect(page.getByText(/High graphics ·/)).toBeVisible();
  await expect(page.getByLabel("Graphics quality")).toHaveCount(0);
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await explore.click();
  for (const view of ["First-person", "Bird’s-eye", "First-person"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(
      page.getByRole("button", { name: view, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({
      path: `output/playwright/high-${view.replace(/[^a-z]/gi, "")}.png`,
    });
  }
  const canvas = await page.locator("canvas").boundingBox();
  await page.mouse.move(
    canvas!.x + canvas!.width / 2,
    canvas!.y + canvas!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvas!.x + canvas!.width / 2 + 120,
    canvas!.y + canvas!.height / 2 + 30,
    {
      steps: 6,
    },
  );
  await page.mouse.up();
  await page.mouse.wheel(0, 160);
  await page.screenshot({ path: "output/playwright/high-fpv-look.png" });
  expect(errors).toEqual([]);
});
