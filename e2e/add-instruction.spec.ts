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
    // Preview should show instruction items (dimmed)
    const previewItems = page.locator(
      ".add-instruction-preview .instruction-item",
    );
    await expect(previewItems.first()).toBeVisible();
  });

  test("typing 'balance and swing your neighbor' adds a matching instruction", async ({
    page,
  }) => {
    const initialCount = await page.locator(".instruction-item").count();

    await page.locator(".add-gap-btn").first().click();
    const input = page.locator(".add-instruction-text-input");
    await expect(input).toBeVisible();

    await input.fill("balance and swing your neighbor");
    await input.press("Enter");

    // Input should close
    await expect(input).not.toBeVisible();

    // A balance_and_swing instruction should now be visible
    const instrItems = page.locator(".instruction-item");
    await expect(instrItems).toHaveCount(initialCount + 1);

    // The instruction should contain "balance & swing" text
    await expect(instrItems.first()).toContainText("balance & swing");
  });

  test("blurring input commits the instruction", async ({ page }) => {
    const initialCount = await page.locator(".instruction-item").count();

    await page.locator(".add-gap-btn").first().click();
    const input = page.locator(".add-instruction-text-input");
    await expect(input).toBeVisible();

    await input.fill("neighbors swing");

    // Click elsewhere to blur the input
    await page.locator(".command-pane").click({ position: { x: 5, y: 5 } });

    // Input should close and instruction should be committed
    await expect(input).not.toBeVisible();
    const instrItems = page.locator(".instruction-item");
    await expect(instrItems).toHaveCount(initialCount + 1);
    await expect(instrItems.first()).toContainText("swing");
  });

  test("blurring via Escape does NOT commit", async ({ page }) => {
    const initialCount = await page.locator(".instruction-item").count();

    await page.locator(".add-gap-btn").first().click();
    const input = page.locator(".add-instruction-text-input");
    await expect(input).toBeVisible();

    await input.fill("neighbors swing");
    await input.press("Escape");

    // Input should close and no instruction should be added
    await expect(input).not.toBeVisible();
    const afterCancel = await page.locator(".instruction-item").count();
    expect(afterCancel).toBe(initialCount);
  });

  test("add input persists after typing into empty dance", async ({ page }) => {
    // Clear all instructions to get an empty dance
    await page.locator("button", { hasText: "clear" }).click();
    await expect(page.locator(".instruction-item")).toHaveCount(0);

    // Click + to open input
    await page.locator(".add-gap-btn").first().click();
    const input = page.locator(".add-instruction-text-input");
    await expect(input).toBeVisible();

    // Type a valid instruction — input should still exist
    await input.fill("neighbors swing");
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test("uncommitted instruction interactive elements have not-allowed cursor and are non-interactive", async ({
    page,
  }) => {
    await page.locator(".add-gap-btn").first().click();
    const input = page.locator(".add-instruction-text-input");
    await expect(input).toBeVisible();

    // Type something that will produce an instruction with an InlineDropdown
    await input.fill("neighbors balance and swing");

    // Wait for the preview to appear
    const previewItems = page.locator(
      ".add-instruction-preview .instruction-item",
    );
    await expect(previewItems.first()).toBeVisible();

    // Find inline-value elements (InlineDropdown triggers) in the preview
    const inlineValues = page.locator(
      ".add-instruction-preview .inline-value",
    );
    await expect(inlineValues.first()).toBeVisible();

    // Check that they have cursor: not-allowed
    const cursor = await inlineValues.first().evaluate(
      (el) => getComputedStyle(el).cursor,
    );
    expect(cursor).toBe("not-allowed");

    // Check that pointer-events are disabled (clicking won't open a popover)
    const pointerEvents = await inlineValues.first().evaluate(
      (el) => getComputedStyle(el).pointerEvents,
    );
    expect(pointerEvents).toBe("none");
  });
});
