import { createContext, useContext } from "react";

import type { ProtoId } from "../contraCore";
import type { Dancer } from "../worldState";

export const InstructionEditContext = createContext<{
  onPopoverOpen?: () => void;
  dancerStates?: Record<ProtoId, Dancer>;
}>({});

export function useInstructionEdit() {
  return useContext(InstructionEditContext);
}
