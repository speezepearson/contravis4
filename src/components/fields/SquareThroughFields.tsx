import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function SquareThroughFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "square_through" }>;
  },
) {
  return null;
}
