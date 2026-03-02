import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function CaliforniaTwirlFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "california_twirl" }>;
  },
) {
  return null;
}
