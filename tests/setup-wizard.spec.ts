import { test, expect } from "@playwright/test";

test.describe("Setup Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByText("Setup Wizard").click();
  });

  test("shows security profile cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Choose a security profile" })).toBeVisible();
    await expect(page.locator("text=Lockdown").first()).toBeVisible();
    await expect(page.locator("text=Balanced").first()).toBeVisible();
    await expect(page.locator("text=Developer").first()).toBeVisible();
    await expect(page.locator("text=Migration Ready").first()).toBeVisible();
  });

  test("selecting a profile advances to next step", async ({ page }) => {
    await page.locator("text=Balanced").first().click();
    await expect(page.getByText("Who can message your agent?")).toBeVisible();
  });

  test("can navigate through all steps", async ({ page }) => {
    // Step 0: pick profile
    await page.locator("text=Lockdown").first().click();

    // Step 1: messaging — advance
    await page.getByRole("button", { name: /Next/ }).click();

    // Step 2: fine-tune permissions
    await expect(page.getByText("Shell Access")).toBeVisible();
    await page.getByRole("button", { name: "Review Config" }).click();

    // Step 3: review
    await expect(page.getByText("Review & Apply")).toBeVisible();
  });

  test("profiles endpoint returns all four profiles", async ({ request }) => {
    const res = await request.get("/api/profiles");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.profiles).toHaveLength(4);
    const ids = body.profiles.map((p: { id: string }) => p.id);
    expect(ids).toContain("lockdown");
    expect(ids).toContain("balanced");
    expect(ids).toContain("developer");
    expect(ids).toContain("migrate");
  });
});
