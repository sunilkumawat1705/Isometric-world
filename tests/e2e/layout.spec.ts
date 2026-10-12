import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 820, height: 1180 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 568, height: 320 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
]) {
  test(`controls and map remain clear at ${viewport.width} × ${viewport.height}`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.setViewportSize(viewport);
    await page.goto("/");
    const start = page.getByRole("button", {
      name: "Explore the village",
      exact: true,
    });
    await expect(start).toBeEnabled({ timeout: 45000 });
    if (viewport.width <= 760) {
      const scene = await page.locator(".scene-host").boundingBox();
      const welcome = await page.locator(".village-welcome").boundingBox();
      expect(scene && welcome && scene.y + scene.height <= welcome.y).toBe(
        true,
      );
      expect(
        await page
          .locator(".village-welcome")
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
    }
    await page.screenshot({
      path: `output/playwright/final-welcome-${viewport.width}.png`,
      fullPage: true,
    });
    await start.click();
    const controls = [".exploration-note", ".adventure-hud", ".view-controls"];
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = await page.locator(controls[i]).boundingBox();
        const b = await page.locator(controls[j]).boundingBox();
        expect(a && b).toBeTruthy();
        const overlaps =
          a &&
          b &&
          Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) &&
          Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
        expect(overlaps, `${controls[i]} must not overlap ${controls[j]}`).toBe(
          false,
        );
      }
    }
    await page
      .getByRole("button", { name: "Open village map", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Village map", exact: true }),
    ).toBeVisible();
    const pins = dialog.locator(".map-landmark");
    await expect(pins).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      const a = await pins.nth(i).boundingBox();
      expect(a?.width).toBeGreaterThanOrEqual(44);
      for (let j = i + 1; j < 5; j++) {
        const b = await pins.nth(j).boundingBox();
        if (a && b) {
          const distance = Math.hypot(
            a.x + a.width / 2 - b.x - b.width / 2,
            a.y + a.height / 2 - b.y - b.height / 2,
          );
          expect(
            distance,
            `Circular map pins ${i + 1} and ${j + 1} must not overlap`,
          ).toBeGreaterThanOrEqual((a.width + b.width) / 2);
        }
      }
    }
    await page.screenshot({
      path: `output/playwright/final-map-${viewport.width}.png`,
    });
    await dialog.getByRole("button", { name: "Crystals", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: "Crystals", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator(".map-crystal")).toHaveCount(8);
    await dialog
      .getByRole("button", { name: "Explore Village Post", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: "Village Post", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: /sunilkumawat7717@gmail.com/ }),
    ).toBeVisible();
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Open village map", exact: true })
      .click();
    await expect(
      dialog
        .getByRole("button", { name: "Explore Village Post", exact: true })
        .locator(".destination-number"),
    ).toHaveClass(/visited/);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await dialog.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });
}
