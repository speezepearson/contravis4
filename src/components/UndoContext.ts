import { createContext, useContext } from "react";

export const UndoContext = createContext<{
  beginTransient: () => void;
  endTransient: () => void;
  undo: () => void;
  redo: () => void;
}>({
  beginTransient: () => {},
  endTransient: () => {},
  undo: () => {},
  redo: () => {},
});

export function useUndo() {
  return useContext(UndoContext);
}
