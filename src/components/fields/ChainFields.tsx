import type { AtomicInstruction } from "../../instructions/_atomic";
import { ALL_CALLED_IDENTIFIERS } from "../../instructions/_base";
import { CalledIdentifierDropdown } from "../CalledIdentifierDropdown";
import type { SubFormProps } from "../fieldUtils";

export function RobinsChainFields({
  instruction,
  onChange,
  onInvalid: _onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "robins_chain" }>;
}) {
  return (
    <>
      {"to "}
      <CalledIdentifierDropdown
        options={ALL_CALLED_IDENTIFIERS}
        value={instruction.cid}
        onChange={(cid) => {
          const result = { ...instruction, cid };
          onChange(result);
        }}
      />
    </>
  );
}
