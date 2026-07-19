import { test, expect } from "@playwright/test";

test("shell → open watch → A-console glass visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "SECTOR 305" })).toBeVisible();
  await expect(page.getByText(/certification-grade/i)).toBeVisible();
  await page.getByRole("button", { name: /OPEN WATCH/i }).click();
  await expect(page.getByText(/SE305-PRI|Incident queue|A07/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/Imperfect map|Unit status|Radio log/i).first()).toBeVisible();
});
