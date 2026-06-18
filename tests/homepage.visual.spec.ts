import { test, expect } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

test.describe("homepage visual checks", () => {
  test("captures the dashboard landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kube Argos Control" })).toBeVisible();
    await argosScreenshot(page, "homepage-dashboard");
  });
});
