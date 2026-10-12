import { test, expect, type Page } from "@playwright/test";

// Stop at a published coordinate in the browser so input latency cannot
// overshoot a doorway or accidentally enter a neighbouring building.
async function walk(
  page: Page,
  keys: string[],
  axis: "x" | "z",
  target: number,
) {
  await page.evaluate(
    ({ keys, axis, target }) =>
      new Promise<void>((resolve, reject) => {
        const status = document.querySelector('[aria-label="Player status"]')!;
        const start = Number(status.getAttribute(`data-${axis}`));
        const stop = () =>
          keys.forEach((key) =>
            window.dispatchEvent(new KeyboardEvent("keyup", { key })),
          );
        const timer = setTimeout(() => {
          stop();
          observer.disconnect();
          reject(new Error("Lodge approach blocked"));
        }, 45000);
        const observer = new MutationObserver(() => {
          const current = Number(status.getAttribute(`data-${axis}`));
          if (target < start ? current <= target : current >= target) {
            stop();
            clearTimeout(timer);
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(status, {
          attributes: true,
          attributeFilter: [`data-${axis}`],
        });
        keys.forEach((key) =>
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key, cancelable: true }),
          ),
        );
      }),
    { keys, axis, target },
  );
}

for (const width of [1440, 390]) {
  test(`avatar enters the dedicated parkour lodge and returns outside at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const explore = page.getByRole("button", {
      name: "Explore the village",
      exact: true,
    });
    await expect(explore).toBeEnabled({ timeout: 45000 });
    await expect(page.locator(".activity-label")).toHaveCount(0);
    await explore.click();
    await page
      .getByRole("button", { name: "Open village map", exact: true })
      .click();
    await expect(
      page.getByRole("img", { name: "Parkour Lodge · north clearing" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await walk(page, ["w", "d", "Shift"], "z", 5.5);
    await walk(page, ["w", "a"], "x", -1);
    await walk(page, ["w", "d", "Shift"], "z", -10.4);
    await walk(page, ["w", "a"], "x", -3);
    const prompt = page.getByRole("button", {
      name: "⚑ Parkour Lodge · Enter jungle trial",
      exact: true,
    });
    await expect(prompt).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `output/playwright/parkour-lodge-${width}.png`,
    });
    // Walking into the open doorway triggers the intro without using the journal.
    await page.keyboard.down("w");
    await page.keyboard.down("d");
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Jungle trial" }),
    ).toBeVisible({ timeout: 15000 });
    await page.keyboard.up("w");
    await page.keyboard.up("d");
    await expect(page.locator(".activity-label")).toHaveCount(0);
    await page.getByRole("button", { name: "Begin", exact: true }).click();
    const status = page.getByLabel("Player status");
    await expect
      .poll(async () => Number(await status.getAttribute("data-x")))
      .toBeGreaterThan(90);
    if (width < 700) {
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      await page
        .getByRole("button", { name: "Return to village", exact: true })
        .click();
    } else {
      await page.getByRole("button", { name: "Exit", exact: true }).click();
    }
    await expect
      .poll(async () => Number(await status.getAttribute("data-x")))
      .toBeCloseTo(-3, 0);
    await expect
      .poll(async () => Number(await status.getAttribute("data-z")))
      .toBeCloseTo(-10.4, 0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(prompt).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
