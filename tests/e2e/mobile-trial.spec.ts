import { test, expect } from "@playwright/test";
for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 760, height: 430 },
]) {
  test(`mobile trial leaves the course visible at ${viewport.width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize(viewport);
    await page.goto("/");
    const explore = page.getByRole("button", {
      name: "Explore the village",
      exact: true,
    });
    await expect(explore).toBeEnabled({ timeout: 45000 });
    await explore.click();
    await page.getByRole("button", { name: /Adventure journal/ }).click();
    await page.getByRole("button", { name: /Jungle trial/ }).click();
    await page.getByRole("button", { name: "Begin", exact: true }).click();
    await expect(page.getByLabel("Parkour challenge")).toBeVisible();
    await expect
      .poll(async () =>
        Number(await page.getByLabel("Player status").getAttribute("data-x")),
      )
      .toBeGreaterThan(90);
    await expect(page.locator(".exploration-note")).toHaveCount(0);
    await expect(page.locator(".view-controls")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Interact", exact: true }),
    ).toHaveCount(0);
    const bounds = await Promise.all(
      [
        ".village-header",
        ".trail-stats",
        ".parkour-hud",
        ".mobile-controls",
      ].map((selector) => page.locator(selector).boundingBox()),
    );
    const [header, stats, hud, controls] = bounds;
    if (header) expect(stats && header.y + header.height <= stats.y).toBe(true);
    else expect(viewport.height).toBeLessThan(500);
    expect(stats && hud && stats.y + stats.height <= hud.y).toBe(true);
    expect(hud!.height).toBeLessThanOrEqual(48);
    expect(controls!.y - hud!.y - hud!.height).toBeGreaterThan(
      viewport.height * (viewport.height < 500 ? 0.35 : 0.45),
    );
    expect(
      await page
        .locator("main")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: `output/playwright/mobile-trial-${viewport.width}.png`,
    });
    const zoom = page.getByLabel("Trial zoom", { exact: true });
    await expect(zoom).toHaveText("100%");
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await expect(zoom).toHaveText("120%");
    await page.screenshot({
      path: `output/playwright/mobile-trial-zoom-${viewport.width}.png`,
    });
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
    await expect(zoom).toHaveText("100%");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Reset to checkpoint", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reset to checkpoint", exact: true })
      .click();
    await expect(page.getByLabel("Parkour challenge")).toBeVisible();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page
      .getByRole("button", { name: "Restart challenge", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Begin", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Begin", exact: true }).click();
    await expect(page.getByLabel("Trial zoom", { exact: true })).toHaveText(
      "100%",
    );
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page
      .getByRole("button", { name: "Return to village", exact: true })
      .click();
    await expect(page.locator(".exploration-note")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
