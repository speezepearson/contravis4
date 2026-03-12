import type { RobinsChainInstruction } from "../../instructions/robinsChain";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import type { SubFormProps } from "../fieldUtils";

export function RobinsChainFields({
  instruction,
  onChange,
  onInvalid: _onInvalid,
}: SubFormProps & {
  instruction: RobinsChainInstruction;
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
