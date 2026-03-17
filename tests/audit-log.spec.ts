import { test, expect } from "@playwright/test";

test.describe("Audit Log", () => {
  test("shows the audit log page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Audit Log");
    await expect(page.locator("h2:has-text('Audit Log')")).toBeVisible();
  });

  test("shows filter buttons", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Audit Log");
    await expect(page.locator("button:has-text('All')")).toBeVisible();
    await expect(page.locator("button:has-text('Info')")).toBeVisible();
    await expect(page.locator("button:has-text('Warning')")).toBeVisible();
    await expect(page.locator("button:has-text('Danger')")).toBeVisible();
  });

  test("audit API returns events array", async ({ request }) => {
    const res = await request.get("/api/audit");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
  });

  test("actions generate audit events", async ({ request }) => {
    // Clear the log first
    await request.delete("/api/audit");

    // Trigger a config read (generates an event)
    await request.get("/api/config");

    // Check the audit log
    const res = await request.get("/api/audit");
    const body = await res.json();
    expect(body.events.length).toBeGreaterThan(0);

    const event = body.events[0];
    expect(event.action).toBe("config_read");
    expect(event.severity).toBe("info");
    expect(event.timestamp).toBeDefined();
  });

  test("clear log empties events", async ({ request }) => {
    // Ensure there's at least one event
    await request.get("/api/config");

    // Clear
    const delRes = await request.delete("/api/audit");
    expect(delRes.ok()).toBeTruthy();

    // Verify empty
    const res = await request.get("/api/audit");
    const body = await res.json();
    expect(body.events).toHaveLength(0);
  });
});
