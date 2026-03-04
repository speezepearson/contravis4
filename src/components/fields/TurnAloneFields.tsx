import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function TurnAloneFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "turn_alone" }>;
  },
) {
  return null;
}
