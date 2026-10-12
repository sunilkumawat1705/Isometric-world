import { test, expect } from "@playwright/test";
test("portfolio sections, filtering, focus, map, and fallback", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "My code. My village." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Explore the village", exact: true }),
  ).toBeEnabled({ timeout: 45000 });
  await page.screenshot({
    path: "output/playwright/forest-village-welcome.png",
  });
  await page
    .getByRole("navigation", { name: "Portfolio navigation" })
    .getByRole("button", { name: "Projects", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Workshop" })).toBeVisible();
  await expect(
    dialog.getByRole("heading", {
      name: "E-commerce Theme Pilot",
      exact: true,
    }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Applications", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", {
      name: "Multi-tenant Site Builder",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", {
      name: "E-commerce Theme Pilot",
      exact: true,
    }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "View work details" }).click();
  await expect(
    dialog.getByText("Built a multi-tenant site builder platform end-to-end"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press("m");
  await expect(
    page.getByRole("heading", { name: "Village map", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open Village Hall from map" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hi, I’m Sunil." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Contact", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: /sunilkumawat7717@gmail.com/ }),
  ).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Phone/ })).toHaveAttribute(
    "href",
    "tel:+917300192621",
  );
  await expect(dialog.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/Sunil0517",
  );
  await expect(dialog.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/sunil-kumawat-3bb6ba178/",
  );
  const resume = await page.request.get("/Sunil_Kumawat_Resume.docx");
  expect(resume.ok()).toBe(true);
  expect(resume.headers()["content-type"]).toContain(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  await page.keyboard.press("Escape");
  await page.goto("/portfolio");
  await expect(
    page.getByRole("heading", { name: "Sunil Kumawat" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Selected work" }),
  ).toBeVisible();
  await expect(
    page.getByText("CGPA: 9.0 / 10", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("React Basics", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Junior Developer · The Developer Company",
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("March 2024 – Present", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("September 2023 – February 2024", { exact: true }),
  ).toBeVisible();
});
test("playable controller moves, jumps, and pauses for panels", async ({
  page,
}) => {
  await page.goto("/");
  const start = page.getByRole("button", {
    name: "Explore the village",
    exact: true,
  });
  await expect(start).toBeEnabled({ timeout: 45000 });
  await start.click();
  const status = page.getByLabel("Player status");
  const before = Number(await status.getAttribute("data-x"));
  await page.keyboard.down("w");
  await page.waitForTimeout(1100);
  await page.keyboard.up("w");
  await expect
    .poll(async () => Number(await status.getAttribute("data-x")))
    .toBeLessThan(before - 0.5);
  await page.keyboard.press("Space");
  await expect
    .poll(() => status.getAttribute("data-state"), { timeout: 2000 })
    .toMatch(/jump|fall/);
  await expect
    .poll(() => status.getAttribute("data-state"), { timeout: 4000 })
    .toBe("idle");
  const projectsButton = page
    .getByRole("navigation")
    .getByRole("button", { name: "Projects", exact: true });
  await projectsButton.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog")).toBeVisible();
  const stopped = Number(await status.getAttribute("data-x"));
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  expect(
    Math.abs(Number(await status.getAttribute("data-x")) - stopped),
  ).toBeLessThan(0.25);
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Projects", exact: true }),
  ).toBeFocused();
  await page.screenshot({ path: "output/playwright/village-desktop.png" });
});
test("mobile controls and responsive panels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Explore the village", exact: true }),
  ).toBeEnabled({ timeout: 45000 });
  await page.screenshot({ path: "output/playwright/village-mobile.png" });
  await page
    .getByRole("button", { name: "Explore the village", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Movement joystick" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Jump", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle portfolio menu" }).click();
  await expect(page.locator(".view-controls")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Toggle portfolio menu" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Toggle portfolio menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Skills", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Village Library" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("buildings block movement and proximity E opens the correct landmark", async ({
  page,
}) => {
  await page.goto("/");
  const start = page.getByRole("button", {
    name: "Explore the village",
    exact: true,
  });
  await expect(start).toBeEnabled({ timeout: 45000 });
  await start.click();
  const status = page.getByLabel("Player status");
  // Stop in the browser as soon as the published position reaches the
  // library's lane; remote keyboard latency can overshoot on software WebGL.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const status = document.querySelector('[aria-label="Player status"]')!;
        const keys = ["w", "d"];
        const stop = () =>
          keys.forEach((key) =>
            window.dispatchEvent(new KeyboardEvent("keyup", { key })),
          );
        const timeout = setTimeout(() => {
          stop();
          observer.disconnect();
          reject(new Error("Entrance bridge approach timed out"));
        }, 30000);
        const observer = new MutationObserver(() => {
          if (Number(status.getAttribute("data-z")) <= 4.5) {
            stop();
            clearTimeout(timeout);
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(status, {
          attributes: true,
          attributeFilter: ["data-z"],
        });
        keys.forEach((key) =>
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key, cancelable: true }),
          ),
        );
      }),
  );
  await expect.poll(() => status.getAttribute("data-state")).toBe("idle");
  expect(Number(await status.getAttribute("data-z"))).toBeGreaterThan(3.5);
  expect(Number(await status.getAttribute("data-z"))).toBeLessThan(7);
  await page.keyboard.down("w");
  await page.keyboard.down("a");
  await expect
    .poll(async () => Number(await status.getAttribute("data-x")), {
      timeout: 12000,
    })
    .toBeLessThan(-8.2);
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  await page.keyboard.up("a");
  const x = Number(await status.getAttribute("data-x"));
  expect(x).toBeGreaterThan(-8.7);
  // Approach below the book table so this checks the cottage wall.
  expect(x).toBeLessThan(-7.5);
  await page.keyboard.down("w");
  await page.keyboard.down("a");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  await page.keyboard.up("a");
  expect(Number(await status.getAttribute("data-x"))).toBeCloseTo(x, 1);
  expect(Number(await status.getAttribute("data-y"))).toBeGreaterThan(0.65);
  await expect(
    page.getByRole("button", {
      name: "E Explore Village Library",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("e");
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Village Library" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Projected labels follow subpixel camera/physics motion. Activate the real
  // accessible button with Enter rather than waiting for pixel stability.
  const libraryLabel = page.getByRole("button", {
    name: "Open Village Library",
    exact: true,
  });
  await libraryLabel.focus();
  await libraryLabel.press("Enter");
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Village Library" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("group", { name: "Interactive isometric Forest Village" })
    .focus();
  await page.keyboard.press("Space");
  await expect
    .poll(async () => Number(await status.getAttribute("data-y")), {
      timeout: 2000,
    })
    .toBeGreaterThan(1.2);
  await expect
    .poll(() => status.getAttribute("data-state"), { timeout: 4000 })
    .toBe("idle");
  expect(Number(await status.getAttribute("data-y"))).toBeGreaterThan(0.65);
});

test("standard portfolio is readable with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/portfolio");
  await expect(
    page.getByRole("heading", { name: "Sunil Kumawat", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "E-commerce Theme Pilot", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Experience", exact: true }),
  ).toBeVisible();
  await context.close();
});

test("jungle trial enters the arena with hearts and gems, then returns home", async ({
  page,
}) => {
  await page.goto("/");
  const start = page.getByRole("button", {
    name: "Explore the village",
    exact: true,
  });
  await expect(start).toBeEnabled({ timeout: 45000 });
  await start.click();
  const status = page.getByLabel("Player status");
  await page.getByRole("button", { name: /Adventure journal/ }).click();
  await page.getByRole("button", { name: /Jungle trial/ }).click();
  await page.getByRole("button", { name: "Begin" }).click();
  await expect(page.getByRole("img", { name: "5 of 5 hearts" })).toBeVisible();
  await expect(page.getByLabel("Gems collected")).toContainText("0");
  // The trial runs on its own river arena, far east of the village island.
  await expect
    .poll(async () => Number(await status.getAttribute("data-x")), {
      timeout: 15000,
    })
    .toBeGreaterThan(90);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByLabel("Trial zoom", { exact: true })).toHaveText(
    "120%",
  );
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(page.getByLabel("Trial zoom", { exact: true })).toHaveText(
    "100%",
  );
  await page.locator("canvas").hover();
  await page.mouse.wheel(0, -120);
  await expect(page.getByLabel("Trial zoom", { exact: true })).not.toHaveText(
    "100%",
  );
  await page.getByRole("button", { name: "Exit", exact: true }).click();
  await expect
    .poll(async () => Number(await status.getAttribute("data-x")), {
      timeout: 15000,
    })
    .toBeLessThan(0);
});
