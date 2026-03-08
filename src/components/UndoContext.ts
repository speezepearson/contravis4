import { createContext, useContext } from "react";

export const UndoContext = createContext<{
  beginTransient: () => void;
  endTransient: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}>({
  beginTransient: () => {},
  endTransient: () => {},
  undo: () => {},
  redo: () => {},
  canUndo: false,
  canRedo: false,
});

export function useUndo() {
  return useContext(UndoContext);
}
