import { test, expect } from "@playwright/test";

test.describe("Permission Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByText("Permissions").click();
  });

  test("shows the security score gauge", async ({ page }) => {
    await expect(page.locator("svg circle").first()).toBeVisible();
    await expect(page.getByText("Overall Security Score")).toBeVisible();
  });

  test("shows permission cards", async ({ page }) => {
    const main = page.locator("main");
    await expect(main.getByText("Shell").first()).toBeVisible();
    await expect(main.getByText("Filesystem").first()).toBeVisible();
    await expect(main.getByText("Browser").first()).toBeVisible();
    await expect(main.getByText("Network").first()).toBeVisible();
  });

  test("config API returns config and score", async ({ request }) => {
    const res = await request.get("/api/config");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.config).toBeDefined();
    expect(body.config.openclaw).toBeDefined();
    expect(body.config.clawguard).toBeDefined();
    expect(body.score).toBeDefined();
    expect(body.score.score).toBeGreaterThanOrEqual(0);
    expect(body.score.score).toBeLessThanOrEqual(100);
    expect(body.score.grade).toMatch(/^[A-F]$/);
  });

  test("config write round-trip preserves valid schema", async ({ request }) => {
    // Read current config
    const readRes = await request.get("/api/config");
    const { config } = await readRes.json();

    // Write it back unchanged
    const writeRes = await request.post("/api/config", { data: config });
    expect(writeRes.ok()).toBeTruthy();
    const writeBody = await writeRes.json();
    expect(writeBody.success).toBe(true);
    expect(writeBody.score).toBeDefined();

    // Read again — should match
    const readRes2 = await request.get("/api/config");
    const { config: config2 } = await readRes2.json();
    expect(config2.openclaw.agents).toEqual(config.openclaw.agents);
    expect(config2.openclaw.gateway.mode).toBe(config.openclaw.gateway.mode);
    expect(config2.openclaw.gateway.bind).toBe(config.openclaw.gateway.bind);
    expect(config2.clawguard.security).toEqual(config.clawguard.security);
  });
});
