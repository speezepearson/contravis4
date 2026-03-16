import { expect, test } from "@playwright/test";

test("dance state round-trips through URL fragment", async ({ page }) => {
  // Visit page and clear localStorage so we start fresh
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector(".command-pane");

  // Clear all existing instructions via delete until empty
  while ((await page.locator(".instruction-item").count()) > 0) {
    await page.locator(".delete-btn").first().click();
  }
  expect(await page.locator(".instruction-item").count()).toBe(0);

  // Click + to add a default balance instruction
  await page.locator(".add-gap-btn").first().click();

  // Verify it was added
  const instrItems = page.locator(".instruction-item");
  await expect(instrItems.first()).toContainText("balance");

  // Wait for the URL hash to be populated (async compression)
  await expect
    .poll(() => new URL(page.url()).hash.length, { timeout: 5000 })
    .toBeGreaterThan(1);
  const savedUrl = page.url();

  // Delete the instruction
  await page.locator(".delete-btn").first().click();
  expect(await page.locator(".instruction-item").count()).toBe(0);

  // Clear localStorage to simulate a fresh session
  await page.evaluate(() => localStorage.clear());

  // Navigate to a blank page first to force a full reload of the target URL
  await page.goto("about:blank");
  await page.goto(savedUrl);
  await page.waitForSelector(".command-pane");

  // Should see the balance instruction restored from the URL fragment
  await expect(page.locator(".instruction-item").first()).toContainText(
    "balance",
  );
});
