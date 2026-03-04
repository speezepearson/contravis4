import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function BendTheLineFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "bend_the_line" }>;
  },
) {
  return null;
}
