import type { AtomicInstruction } from "../../instructions/_atomic";
import type { SubFormProps } from "../fieldUtils";

export function TurnAsACoupleFields(_props: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "turn_as_a_couple" }>;
}) {
  return null;
}
