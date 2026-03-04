import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function BoxCirculateFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "box_circulate" }>;
  },
) {
  return null;
}
