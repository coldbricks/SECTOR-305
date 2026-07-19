import { test, expect } from "@playwright/test";

test("expected autoplay blocking stays out of the warning channel", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });

  await page.goto("/");
  await page.waitForTimeout(300);

  expect(warnings.filter((warning) => warning.includes("[shellMusic]"))).toEqual([]);
});

test("the scenario score has an explicit operator control", async ({ page }) => {
  await page.goto("/");
  const scenarioTrack = page.waitForRequest((request) =>
    request.url().includes("/audio/scenarios/")
  );
  await page.getByRole("button", { name: "BEGIN" }).click();
  const score = page.getByRole("button", { name: "Scenario score" });
  await expect(score).toBeVisible({ timeout: 15_000 });
  await expect(score).toHaveAttribute("aria-pressed", "true");
  await scenarioTrack;
  await expect(page.getByLabel("Live evaluation")).toContainText("SCORE");
  await expect(page.getByLabel("Live evaluation")).toContainText(
    "Miami Cipher"
  );
  await page.getByRole("button", { name: "Score controls" }).click();
  const scoreDesk = page.getByRole("complementary", {
    name: "Scenario score controls",
  });
  await expect(scoreDesk).toBeVisible();
  await expect(scoreDesk.getByLabel("Scenario score catalog").getByRole("button")).toHaveCount(17);
  const gloriaRequest = page.waitForRequest((request) =>
    request.url().includes("/audio/scenarios/gloria-bay.mp3")
  );
  await scoreDesk.getByRole("button", { name: /Gloria Bay/ }).click();
  await gloriaRequest;
  await expect(scoreDesk).toContainText("Gloria Bay");
  await score.click();
  await expect(score).toHaveAttribute("aria-pressed", "false");
});

test("shell → open watch → A-console glass visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("305").first()).toBeVisible();
  await expect(page.getByText(/certification-grade|Complexity that grades/i)).toBeVisible();
  await page.getByRole("button", { name: "BEGIN" }).click();
  await expect(page.getByText(/SE305-PRI|Incident queue|A07|SECTOR PLATE/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText(/SECTOR PLATE|Unit status|Radio log|IMPERFECT/i).first()
  ).toBeVisible({ timeout: 15_000 });
});

test("the public channel bank is explicitly fictional", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN" }).click();
  const bank = page.getByRole("region", { name: "Fictional channel bank" });
  await expect(bank).toBeVisible({ timeout: 15_000 });
  await expect(bank).toContainText("SIM · A07");
  await expect(bank).toContainText("SE305 PRI");
  await expect(bank).not.toContainText(/RadioReference|CTID|453\.1000/);
});

test("1280x720 keeps the primary CAD workspace usable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "s305.map.workspace",
      JSON.stringify({
        mode: "docked",
        dockWidth: 467,
        dockHeight: 765,
        float: { x: 80, y: 72, w: 720, h: 520 },
        look: { theme: "cyan", roadGain: 1, fillGain: 1, labelGain: 1, brightness: 1 },
        lookOpen: false,
      })
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN" }).click();

  await expect(page.getByRole("heading", { name: /Incident queue/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: "CFS detail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dispatch 2× AVL patrol" })).toBeVisible();
  await expect(page.getByRole("application", { name: /interactive sector map/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /26-000142/ })).toBeVisible();

  const queueBox = await page.locator(".queue-panel").boundingBox();
  const detailBox = await page.locator(".queue-panel + .panel").boundingBox();
  const mapBox = await page.locator(".map-panel").boundingBox();
  const bottomRailBox = await page.locator(".bottom-rail").boundingBox();
  expect(queueBox?.height).toBeGreaterThan(220);
  expect(detailBox?.height).toBeGreaterThan(220);
  expect(mapBox?.height).toBeGreaterThan(220);
  expect((mapBox?.x ?? 0) + (mapBox?.width ?? 0)).toBeLessThanOrEqual(1280);
  expect((mapBox?.y ?? 0) + (mapBox?.height ?? 0)).toBeLessThanOrEqual(bottomRailBox?.y ?? 0);
});

test("persisted map width stays inside its desktop grid track", async ({ page }) => {
  await page.setViewportSize({ width: 1471, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "s305.map.workspace",
      JSON.stringify({
        mode: "docked",
        dockWidth: 467,
        dockHeight: 765,
        float: { x: 80, y: 72, w: 720, h: 520 },
        look: { theme: "cyan", roadGain: 1, fillGain: 1, labelGain: 1, brightness: 1 },
        lookOpen: false,
      })
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN" }).click();
  await expect(page.getByRole("application", { name: /interactive sector map/i })).toBeVisible({
    timeout: 15_000,
  });

  const mapBox = await page.locator(".map-panel").boundingBox();
  expect((mapBox?.x ?? 0) + (mapBox?.width ?? 0)).toBeLessThanOrEqual(1471);
});

test("canonical UI checkride reaches a passing debrief", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN" }).click();
  await expect(page.getByRole("heading", { name: "CFS detail" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "+30s", exact: true }).click();
  await page.getByRole("combobox", { name: "Nature" }).selectOption("ROBBERY-IP");
  await page.getByRole("combobox", { name: "Priority" }).selectOption("P1");
  await page.getByRole("button", { name: "Flag WEAPONS" }).click();
  await page.getByRole("button", { name: "Flag BACKUP" }).click();
  await page.getByRole("button", { name: "Verify → 1400 Ocean (truth)" }).click();

  await page.getByRole("button", { name: "Dispatch 2× AVL patrol" }).click();
  await page.getByRole("button", { name: "Sim unit ACKs" }).click();
  await page.getByRole("button", { name: "Sim on scene" }).click();
  await page.getByRole("button", { name: "Clear GOA" }).click();
  await page.getByRole("button", { name: "End / Debrief" }).click();

  await expect(page.getByRole("heading", { name: "CHECKRIDE · PASS" })).toBeVisible();
  await expect(page.getByText("None recorded.")).toBeVisible();
  await expect(page.getByText(/^NEXT WATCH · STANDARD$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Run it cleaner" })).toBeVisible();
});

test("a failed watch becomes a persistent next-watch objective", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN" }).click();
  await expect(page.getByRole("heading", { name: "CFS detail" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "+30s", exact: true }).click();
  await page.getByRole("button", { name: "Dispatch 1× (risk)" }).click();
  await page.getByRole("button", { name: "End / Debrief" }).click();

  await expect(page.getByRole("heading", { name: "CHECKRIDE · FAIL" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verify before you launch" })).toBeVisible();
  await page.getByRole("button", { name: "Run it cleaner" }).click();

  await expect(page.getByLabel("Next watch objective")).toContainText("LOCATION");
  await expect(page.getByLabel("Next watch objective")).toContainText(
    "Verify before you launch"
  );

  await page.getByRole("button", { name: "BEGIN" }).click();
  await expect(page.getByLabel("Live evaluation")).toContainText("LOCATION", {
    timeout: 15_000,
  });
  await page.reload();
  await page.getByRole("button", { name: "Reset adaptive profile" }).click();
  await expect(page.getByLabel("Next watch objective")).toContainText("BASELINE");
});

test("single-column console starts with a compact coach", async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN" }).click();
  await expect(page.getByRole("heading", { name: "CFS detail" })).toBeVisible({
    timeout: 15_000,
  });

  await expect(page.getByRole("button", { name: /COACH · 2\/9/ })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Training walkthrough coach" })
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(760);
});

test("agency actions use native controls and never nest interactive elements", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "BEGIN" }).click();
  await expect(page.getByRole("heading", { name: "CFS detail" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator(".agency-panel [role='button']")).toHaveCount(0);
  await page.getByRole("tab", { name: "EMS RESCUE" }).click();
  await expect(page.locator(".ems-row").first()).toBeVisible();

  const nestedInteractive = page.locator(
    ".agency-panel button button, .agency-panel button [role='button']"
  );
  await expect(nestedInteractive).toHaveCount(0);
});
