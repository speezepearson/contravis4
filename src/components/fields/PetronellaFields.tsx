import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function PetronellaFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "petronella" }>;
  },
) {
  return null;
}
