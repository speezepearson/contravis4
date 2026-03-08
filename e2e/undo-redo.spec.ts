import { expect, test } from "@playwright/test";

test.describe("undo/redo", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so we start fresh each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".command-pane");
  });

  test("undo and redo buttons start disabled", async ({ page }) => {
    const undo = page.locator(".undo-btn");
    const redo = page.locator(".redo-btn");
    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();
  });

  test("adding an instruction enables undo", async ({ page }) => {
    const undo = page.locator(".undo-btn");

    // Add an instruction via the "+" gap button
    await page.locator(".add-gap-btn").first().click();
    await expect(undo).toBeEnabled();
  });

  test("undo reverts an added instruction", async ({ page }) => {
    const instructionsBefore = await page
      .locator(".instruction-item")
      .count();

    // Add an instruction
    await page.locator(".add-gap-btn").first().click();
    const instructionsAfter = await page
      .locator(".instruction-item")
      .count();
    expect(instructionsAfter).toBe(instructionsBefore + 1);

    // Undo
    await page.locator(".undo-btn").click();
    const instructionsUndone = await page
      .locator(".instruction-item")
      .count();
    expect(instructionsUndone).toBe(instructionsBefore);
  });

  test("redo restores an undone instruction", async ({ page }) => {
    const instructionsBefore = await page
      .locator(".instruction-item")
      .count();

    // Add, undo, redo
    await page.locator(".add-gap-btn").first().click();
    await page.locator(".undo-btn").click();
    await page.locator(".redo-btn").click();

    const instructionsAfter = await page
      .locator(".instruction-item")
      .count();
    expect(instructionsAfter).toBe(instructionsBefore + 1);
  });

  test("Ctrl+Z triggers undo", async ({ page }) => {
    const instructionsBefore = await page
      .locator(".instruction-item")
      .count();

    await page.locator(".add-gap-btn").first().click();
    await page.keyboard.press("Control+z");

    const instructionsAfter = await page
      .locator(".instruction-item")
      .count();
    expect(instructionsAfter).toBe(instructionsBefore);
  });

  test("Ctrl+Shift+Z triggers redo", async ({ page }) => {
    const instructionsBefore = await page
      .locator(".instruction-item")
      .count();

    await page.locator(".add-gap-btn").first().click();
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+Shift+z");

    const instructionsAfter = await page
      .locator(".instruction-item")
      .count();
    expect(instructionsAfter).toBe(instructionsBefore + 1);
  });

  test("Ctrl+Y triggers redo", async ({ page }) => {
    const instructionsBefore = await page
      .locator(".instruction-item")
      .count();

    await page.locator(".add-gap-btn").first().click();
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+y");

    const instructionsAfter = await page
      .locator(".instruction-item")
      .count();
    expect(instructionsAfter).toBe(instructionsBefore + 1);
  });

  test("deleting an instruction can be undone", async ({ page }) => {
    // Add an instruction first so there's something to delete
    await page.locator(".add-gap-btn").first().click();
    const countAfterAdd = await page.locator(".instruction-item").count();

    // Delete it
    await page.locator(".delete-btn").first().click();
    const countAfterDelete = await page.locator(".instruction-item").count();
    expect(countAfterDelete).toBe(countAfterAdd - 1);

    // Undo the delete
    await page.locator(".undo-btn").click();
    const countAfterUndo = await page.locator(".instruction-item").count();
    expect(countAfterUndo).toBe(countAfterAdd);
  });

  test("new edit after undo clears redo", async ({ page }) => {
    const redo = page.locator(".redo-btn");

    // Add, undo (redo should be available), then add again (redo cleared)
    await page.locator(".add-gap-btn").first().click();
    await page.locator(".undo-btn").click();
    await expect(redo).toBeEnabled();

    await page.locator(".add-gap-btn").first().click();
    await expect(redo).toBeDisabled();
  });

  test("multiple undos walk back through history", async ({ page }) => {
    const initial = await page.locator(".instruction-item").count();

    // Add two instructions
    await page.locator(".add-gap-btn").first().click();
    await page.locator(".add-gap-btn").first().click();
    expect(await page.locator(".instruction-item").count()).toBe(initial + 2);

    // Undo twice
    await page.locator(".undo-btn").click();
    expect(await page.locator(".instruction-item").count()).toBe(initial + 1);
    await page.locator(".undo-btn").click();
    expect(await page.locator(".instruction-item").count()).toBe(initial);

    await expect(page.locator(".undo-btn")).toBeDisabled();
  });

  test("loading a dance is a single undo entry", async ({ page }) => {
    // Load a dance
    await page.locator(".dance-loader select").selectOption({ index: 1 });
    await expect(page.locator(".instruction-item").first()).toBeVisible();
    const countAfterLoad = await page.locator(".instruction-item").count();
    expect(countAfterLoad).toBeGreaterThan(0);

    // Single undo should return to the empty state
    await page.locator(".undo-btn").click();
    expect(await page.locator(".instruction-item").count()).toBe(0);
  });
});
