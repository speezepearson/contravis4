import { useCallback, useRef, useState } from "react";

const MAX_UNDO_STACK = 200;

/**
 * Generic undo/redo hook with support for transient (coalesced) updates.
 *
 * Call `beginTransient()` before a sequence of rapid updates (e.g. drag)
 * and `endTransient()` when done. All updates during a transient session
 * collapse into a single undo entry.
 */
export function useUndoRedo<T>(initialState: T) {
  const [state, setStateRaw] = useState(initialState);
  const stateRef = useRef(initialState);

  const undoStackRef = useRef<T[]>([]);
  const redoStackRef = useRef<T[]>([]);

  // Transient session tracking
  const isTransientRef = useRef(false);
  const preTransientRef = useRef<T | null>(null);

  // Track stack emptiness in state so React re-renders when it changes
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncCan = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const pushUndo = useCallback(
    (entry: T) => {
      const stack = undoStackRef.current;
      stack.push(entry);
      if (stack.length > MAX_UNDO_STACK) {
        stack.splice(0, stack.length - MAX_UNDO_STACK);
      }
      redoStackRef.current = [];
      syncCan();
    },
    [syncCan],
  );

  const setState = useCallback(
    (next: T) => {
      if (!isTransientRef.current) {
        pushUndo(stateRef.current);
      }
      stateRef.current = next;
      setStateRaw(next);
    },
    [pushUndo],
  );

  const beginTransient = useCallback(() => {
    if (!isTransientRef.current) {
      preTransientRef.current = stateRef.current;
      isTransientRef.current = true;
    }
  }, []);

  const endTransient = useCallback(() => {
    if (isTransientRef.current) {
      const pre = preTransientRef.current;
      if (pre !== null && pre !== stateRef.current) {
        pushUndo(pre);
      }
      isTransientRef.current = false;
      preTransientRef.current = null;
    }
  }, [pushUndo]);

  const flushTransient = useCallback(() => {
    if (isTransientRef.current) {
      const pre = preTransientRef.current;
      if (pre !== null && pre !== stateRef.current) {
        undoStackRef.current.push(pre);
        if (undoStackRef.current.length > MAX_UNDO_STACK) {
          undoStackRef.current.splice(
            0,
            undoStackRef.current.length - MAX_UNDO_STACK,
          );
        }
      }
      isTransientRef.current = false;
      preTransientRef.current = null;
    }
  }, []);

  const undo = useCallback(() => {
    flushTransient();

    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const prev = stack.pop()!;
    redoStackRef.current.push(stateRef.current);
    stateRef.current = prev;
    setStateRaw(prev);
    syncCan();
  }, [flushTransient, syncCan]);

  const redo = useCallback(() => {
    flushTransient();

    const rStack = redoStackRef.current;
    if (rStack.length === 0) return;
    const next = rStack.pop()!;
    undoStackRef.current.push(stateRef.current);
    stateRef.current = next;
    setStateRaw(next);
    syncCan();
  }, [flushTransient, syncCan]);

  return {
    state,
    setState,
    beginTransient,
    endTransient,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
