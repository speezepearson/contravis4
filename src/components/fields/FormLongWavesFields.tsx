import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function FormLongWavesFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "form_long_waves" }>;
  },
) {
  return null;
}
