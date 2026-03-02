import { createContext, useContext } from "react";

import type { ProtoId } from "../contraCore";
import type { DancerState } from "../worldState";

export const InstructionEditContext = createContext<{
  onPopoverOpen?: () => void;
  dancerStates?: Record<ProtoId, DancerState>;
}>({});

export function useInstructionEdit() {
  return useContext(InstructionEditContext);
}
