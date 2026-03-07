import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierSchema } from "../../instructions/_base";
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
        options={CalledIdentifierSchema.options}
        value={instruction.cid}
        onChange={(cid) => {
          const result = { ...instruction, cid };
          onChange(result);
        }}
      />
    </>
  );
}
