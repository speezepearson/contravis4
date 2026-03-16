import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/** Add an instruction by clicking the + button (inserts a default balance). */
async function addInstruction(page: Page) {
  await page.locator(".add-gap-btn").first().click();
}

test.describe("undo/redo", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage so we start fresh each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".command-pane");
  });

  test("adding an instruction can be undone with Ctrl+Z", async ({ page }) => {
    const instructionsBefore = await page
      .locator(".instruction-item")
      .count();

    await addInstruction(page);
    const instructionsAfter = await page
      .locator(".instruction-item")
      .count();
    expect(instructionsAfter).toBe(instructionsBefore + 1);

    await page.keyboard.press("Control+z");
    const instructionsUndone = await page
      .locator(".instruction-item")
      .count();
    expect(instructionsUndone).toBe(instructionsBefore);
  });

  test("Ctrl+Shift+Z triggers redo", async ({ page }) => {
    const instructionsBefore = await page
      .locator(".instruction-item")
      .count();

    await addInstruction(page);
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

    await addInstruction(page);
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+y");

    const instructionsAfter = await page
      .locator(".instruction-item")
      .count();
    expect(instructionsAfter).toBe(instructionsBefore + 1);
  });

  test("deleting an instruction can be undone", async ({ page }) => {
    // Add an instruction first so there's something to delete
    await addInstruction(page);
    const countAfterAdd = await page.locator(".instruction-item").count();

    // Delete it
    await page.locator(".delete-btn").first().click();
    const countAfterDelete = await page.locator(".instruction-item").count();
    expect(countAfterDelete).toBe(countAfterAdd - 1);

    // Undo the delete
    await page.keyboard.press("Control+z");
    const countAfterUndo = await page.locator(".instruction-item").count();
    expect(countAfterUndo).toBe(countAfterAdd);
  });

  test("new edit after undo clears redo", async ({ page }) => {
    const instructionsBefore = await page
      .locator(".instruction-item")
      .count();

    // Add, undo (redo should be available), then add again (redo cleared)
    await addInstruction(page);
    await page.keyboard.press("Control+z");

    await addInstruction(page);
    // Redo should do nothing since history was cleared
    await page.keyboard.press("Control+Shift+z");
    expect(await page.locator(".instruction-item").count()).toBe(
      instructionsBefore + 1,
    );
  });

  test("multiple undos walk back through history", async ({ page }) => {
    const initial = await page.locator(".instruction-item").count();

    // Add two instructions
    await addInstruction(page);
    await addInstruction(page);
    expect(await page.locator(".instruction-item").count()).toBe(initial + 2);

    // Undo twice
    await page.keyboard.press("Control+z");
    expect(await page.locator(".instruction-item").count()).toBe(initial + 1);
    await page.keyboard.press("Control+z");
    expect(await page.locator(".instruction-item").count()).toBe(initial);

    // Further undo should do nothing
    await page.keyboard.press("Control+z");
    expect(await page.locator(".instruction-item").count()).toBe(initial);
  });

  test("loading a dance is a single undo entry", async ({ page }) => {
    const initialCount = await page.locator(".instruction-item").count();

    // Load a dance
    await page.locator(".dance-loader select").selectOption({ index: 1 });
    await expect(page.locator(".instruction-item").first()).toBeVisible();
    const countAfterLoad = await page.locator(".instruction-item").count();
    expect(countAfterLoad).not.toBe(initialCount);

    // Single undo should return to the initial state
    await page.keyboard.press("Control+z");
    expect(await page.locator(".instruction-item").count()).toBe(initialCount);
  });
});
