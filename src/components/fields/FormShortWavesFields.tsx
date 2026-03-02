import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function FormShortWavesFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "form_short_waves" }>;
  },
) {
  return null;
}
