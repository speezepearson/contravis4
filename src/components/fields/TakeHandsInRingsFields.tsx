import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function TakeHandsInRingsFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "take_hands_in_rings" }>;
  },
) {
  return null;
}
