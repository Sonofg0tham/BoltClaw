import { test, expect } from "@playwright/test";

test.describe("Dashboard loads", () => {
  test("serves the frontend", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toContainText("BoltClaw");
  });

  test("shows all four navigation tabs", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    await expect(nav.getByText("Setup Wizard")).toBeVisible();
    await expect(nav.getByText("Permissions")).toBeVisible();
    await expect(nav.getByText("Skill Scanner")).toBeVisible();
    await expect(nav.getByText("Audit Log")).toBeVisible();
  });

  test("health endpoint returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});
