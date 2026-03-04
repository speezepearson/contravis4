import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function LongLinesForwardBackFields(
  _props: SubFormProps & {
    instruction: Extract<
      AtomicInstruction,
      { type: "long_lines_forward_back" }
    >;
  },
) {
  return null;
}
