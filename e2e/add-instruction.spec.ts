import { expect, test } from "@playwright/test";

test.describe("add instruction via text input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".command-pane");
  });

  test("clicking + on empty dance shows text input, typing and pressing Enter adds instructions", async ({
    page,
  }) => {
    // Verify the dance starts empty
    const initialCount = await page.locator(".instruction-item").count();
    expect(initialCount).toBe(0);

    // Click the first + button to start adding
    await page.locator(".add-gap-btn").first().click();

    // A text input should now be visible
    const input = page.locator(".add-instruction-text-input");
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    // Type an instruction and press Enter
    await input.fill("neighbors balance and swing");
    await input.press("Enter");

    // The instruction should have been added (balance_and_swing = 1 instruction item)
    const afterFirst = await page.locator(".instruction-item").count();
    expect(afterFirst).toBeGreaterThan(0);

    // Add another instruction
    await page.locator(".add-gap-btn").first().click();
    const input2 = page.locator(".add-instruction-text-input");
    await expect(input2).toBeVisible();
    await input2.fill("circle left 3 places");
    await input2.press("Enter");

    // Should now have more instructions
    const afterSecond = await page.locator(".instruction-item").count();
    expect(afterSecond).toBeGreaterThan(afterFirst);
  });

  test("pressing Escape cancels adding without inserting", async ({
    page,
  }) => {
    const initialCount = await page.locator(".instruction-item").count();

    await page.locator(".add-gap-btn").first().click();
    const input = page.locator(".add-instruction-text-input");
    await expect(input).toBeVisible();

    await input.fill("neighbors swing");
    await input.press("Escape");

    // Input should be gone and no instructions added
    await expect(input).not.toBeVisible();
    const afterCancel = await page.locator(".instruction-item").count();
    expect(afterCancel).toBe(initialCount);
  });

  test("preview shows parsed instructions while typing", async ({ page }) => {
    await page.locator(".add-gap-btn").first().click();
    const input = page.locator(".add-instruction-text-input");
    await expect(input).toBeVisible();

    // No preview when empty
    await expect(page.locator(".add-instruction-preview")).not.toBeVisible();

    // Type something unparseable
    await input.fill("xyzzy");
    await expect(page.locator(".add-instruction-preview-empty")).toBeVisible();

    // Type something parseable
    await input.fill("neighbors swing");
    await expect(
      page.locator(".add-instruction-preview-empty"),
    ).not.toBeVisible();
    // Preview instructions should appear as dimmed items in the instruction list
    const previewItems = page.locator(".instruction-item.dimmed");
    await expect(previewItems.first()).toBeVisible();
  });
});
