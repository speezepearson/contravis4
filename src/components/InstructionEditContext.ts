import react from "react";

import type { WorldState } from "../worldState";

export const InstructionEditContext = react.createContext<{
  onPopoverOpen?: () => void;
  worldState?: WorldState;
}>({});

export function useInstructionEdit() {
  return react.useContext(InstructionEditContext);
}
