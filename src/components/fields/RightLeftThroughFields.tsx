import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function RightLeftThroughFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "right_left_through" }>;
  },
) {
  return null;
}
