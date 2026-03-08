import { describe, expect, it } from "vitest";

// Test the core undo/redo logic without React rendering.
// We simulate what the hook does by extracting the logic into a plain class.

class UndoRedoTester<T> {
  state: T;
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  private isTransient = false;
  private preTransient: T | null = null;

  constructor(initial: T) {
    this.state = initial;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }

  setState(next: T) {
    if (!this.isTransient) {
      this.undoStack.push(this.state);
      this.redoStack = [];
    }
    this.state = next;
  }

  beginTransient() {
    if (!this.isTransient) {
      this.preTransient = this.state;
      this.isTransient = true;
    }
  }

  endTransient() {
    if (this.isTransient) {
      if (this.preTransient !== null && this.preTransient !== this.state) {
        this.undoStack.push(this.preTransient);
        this.redoStack = [];
      }
      this.isTransient = false;
      this.preTransient = null;
    }
  }

  private flushTransient() {
    if (this.isTransient) {
      if (this.preTransient !== null && this.preTransient !== this.state) {
        this.undoStack.push(this.preTransient);
      }
      this.isTransient = false;
      this.preTransient = null;
    }
  }

  undo() {
    this.flushTransient();
    if (this.undoStack.length === 0) return;
    const prev = this.undoStack.pop()!;
    this.redoStack.push(this.state);
    this.state = prev;
  }

  redo() {
    this.flushTransient();
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(this.state);
    this.state = next;
  }
}

describe("useUndoRedo logic", () => {
  it("starts with initial state and no undo/redo", () => {
    const h = new UndoRedoTester("a");
    expect(h.state).toBe("a");
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });

  it("pushes to undo stack on setState", () => {
    const h = new UndoRedoTester("a");
    h.setState("b");
    expect(h.state).toBe("b");
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
  });

  it("undo restores previous state", () => {
    const h = new UndoRedoTester("a");
    h.setState("b");
    h.undo();
    expect(h.state).toBe("a");
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(true);
  });

  it("redo restores undone state", () => {
    const h = new UndoRedoTester("a");
    h.setState("b");
    h.undo();
    h.redo();
    expect(h.state).toBe("b");
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
  });

  it("new setState after undo clears redo stack", () => {
    const h = new UndoRedoTester("a");
    h.setState("b");
    h.undo();
    h.setState("c");
    expect(h.state).toBe("c");
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
  });

  it("multiple undo/redo steps", () => {
    const h = new UndoRedoTester("a");
    h.setState("b");
    h.setState("c");
    h.setState("d");

    h.undo();
    expect(h.state).toBe("c");
    h.undo();
    expect(h.state).toBe("b");
    h.undo();
    expect(h.state).toBe("a");
    expect(h.canUndo).toBe(false);

    h.redo();
    expect(h.state).toBe("b");
    h.redo();
    expect(h.state).toBe("c");
    h.redo();
    expect(h.state).toBe("d");
    expect(h.canRedo).toBe(false);
  });

  describe("transient updates", () => {
    it("coalesces transient updates into a single undo entry", () => {
      const h = new UndoRedoTester("a");
      h.beginTransient();
      h.setState("b");
      h.setState("c");
      h.setState("d");
      h.endTransient();

      expect(h.state).toBe("d");
      expect(h.canUndo).toBe(true);

      h.undo();
      expect(h.state).toBe("a");
      expect(h.canUndo).toBe(false);
    });

    it("no-op transient session does not create undo entry", () => {
      const h = new UndoRedoTester("a");
      h.beginTransient();
      h.endTransient();
      expect(h.state).toBe("a");
      expect(h.canUndo).toBe(false);
    });

    it("undo during transient session flushes it first", () => {
      const h = new UndoRedoTester("a");
      h.setState("b");

      h.beginTransient();
      h.setState("c");
      h.setState("d");
      h.undo();

      expect(h.state).toBe("b");
    });

    it("transient after normal updates preserves both", () => {
      const h = new UndoRedoTester("a");
      h.setState("b");

      h.beginTransient();
      h.setState("c");
      h.setState("d");
      h.endTransient();

      h.setState("e");

      h.undo();
      expect(h.state).toBe("d");

      h.undo();
      expect(h.state).toBe("b");

      h.undo();
      expect(h.state).toBe("a");
    });

    it("redo after undoing a transient block", () => {
      const h = new UndoRedoTester("a");

      h.beginTransient();
      h.setState("b");
      h.setState("c");
      h.endTransient();

      h.undo();
      expect(h.state).toBe("a");

      h.redo();
      expect(h.state).toBe("c");
    });
  });
});
