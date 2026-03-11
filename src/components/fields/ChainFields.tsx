import type { AtomicInstruction } from "../../instructions/_atomic";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
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
      <CalledIdentifierEditor
        value={instruction.cid}
        onChange={(cid) => {
          const result = { ...instruction, cid };
          onChange(result);
        }}
      />
    </>
  );
}
