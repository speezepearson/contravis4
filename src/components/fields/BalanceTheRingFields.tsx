import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function BalanceTheRingFields(
  _props: SubFormProps & {
    instruction: Extract<AtomicInstruction, { type: "balance_the_ring" }>;
  },
) {
  return null;
}
