import { test, expect, type Page } from "@playwright/test";

async function finishRun(page: Page) {
  await page.evaluate(() => {
    const element = document.querySelector(".parkour-hud")!;
    const key = Object.keys(element).find((k) =>
      k.startsWith("__reactFiber$"),
    )!;
    type Fiber = { return?: Fiber; memoizedState?: Hook };
    type Hook = {
      memoizedState?: {
        activeGame?: string;
        complete?: (time: number) => void;
      };
      next?: Hook;
    };
    let fiber = (element as unknown as Record<string, Fiber>)[key];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        if (
          hook.memoizedState?.activeGame === "parkour" &&
          typeof hook.memoizedState.complete === "function"
        ) {
          hook.memoizedState.complete(42.12);
          return;
        }
        hook = hook.next;
      }
      fiber = fiber.return!;
    }
    throw new Error("Could not find the adventure snapshot");
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`completed run can be named, saved once and read after reload at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize(viewport);
    await page.goto("/");
    const explore = page.getByRole("button", {
      name: "Explore the village",
      exact: true,
    });
    await expect(explore).toBeEnabled({ timeout: 45000 });
    await explore.click();
    await page.getByRole("button", { name: /Adventure journal/ }).click();
    await page
      .getByRole("button", { name: /Jungle trial/, exact: false })
      .click();
    await page.getByRole("button", { name: "Begin", exact: true }).click();
    await expect(page.getByLabel("Parkour challenge")).toBeVisible();
    // Seed a deterministic finish through the UI's real store snapshot. This
    // exercises completion → result → storage without a production debug API.
    // Physics, checkpoints and finish scoring have separate unit/gameplay tests.
    await finishRun(page);
    await expect(
      page.getByRole("heading", { name: "Trail conquered." }),
    ).toBeVisible();
    await expect(page.locator(".adventure-toast")).toHaveCount(0);
    const save = page.getByRole("button", { name: "Save record", exact: true });
    await expect(save).toBeDisabled();
    await page.getByLabel(/What’s your name/).fill("Village Runner");
    await save.click();
    await expect(page.getByText(/Record saved\./)).toBeVisible();
    await expect(save).toHaveCount(0);
    await page
      .getByRole("button", { name: "View leaderboard", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Village leaderboard" }),
    ).toBeVisible();
    await expect(dialog.getByText("Village Runner", { exact: true })).toHaveCount(
      1,
    );
    await expect(dialog.locator(".record-time")).toContainText("42.12");
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: `output/playwright/records-${viewport.width}.png`,
    });
    await page.reload();
    await expect(explore).toBeEnabled({ timeout: 45000 });
    await explore.click();
    await page.getByRole("button", { name: /Adventure journal/ }).click();
    await page.getByRole("button", { name: /Village leaderboard/ }).click();
    await expect(
      page.getByRole("dialog").getByText("Village Runner", { exact: true }),
    ).toHaveCount(1);
  });
}

test("blocked storage keeps a completed run available and reports save failure", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    };
  });
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
  await finishRun(page);
  await expect(
    page.getByRole("heading", { name: "Trail conquered." }),
  ).toBeVisible();
  await page.getByLabel(/What’s your name/).fill("Runner");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Your record could not be saved",
  );
  await expect(
    page.getByRole("button", { name: "Save record", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText(/Record saved\./)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Return to village", exact: true })
    .click();
  await expect(page.locator(".exploration-note")).toBeVisible();
});
