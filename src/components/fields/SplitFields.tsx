import { InstructionSchema } from "../../instructions/index";
import type { Instruction } from "../../instructions/index";
import { z } from "zod";
import type { SubFormProps } from "../fieldUtils";
import { SPLIT_BY_OPTIONS, SPLIT_BY_LABELS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";
import { splitLists, splitWithLists } from "../../generate";
import type { Split } from "../../instructions/split";

export function SplitFields({
  instruction,
  onChange,
}: SubFormProps & { instruction: Extract<Instruction, { type: "split" }> }) {
  function tryCommit(by: Split["by"]) {
    const [listA, listB] = splitLists(instruction);
    const result = InstructionSchema.safeParse({
      id: instruction.id,
      type: "split",
      ...splitWithLists(by, listA, listB),
    });
    if (result.success) onChange(result.data);
  }

  return (
    <>
      {" by "}
      <InlineDropdown
        options={SPLIT_BY_OPTIONS}
        value={instruction.by}
        onChange={(v) =>
          tryCommit(z.enum(["role", "direction"]).parse(v))
        }
        getLabel={(v) => SPLIT_BY_LABELS[v] ?? v}
      />
    </>
  );
}
