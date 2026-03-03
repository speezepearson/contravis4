import { z } from "zod";

import { splitLists, splitWithLists } from "../../generate";
import type { Instruction } from "../../instructions/index";
import type { Split } from "../../instructions/split";
import { SplitSchema } from "../../instructions/split";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { SPLIT_BY_LABELS, SPLIT_BY_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

export function SplitFields({
  instruction,
  onChange,
}: SubFormProps & { instruction: Extract<Instruction, { type: "split" }> }) {
  function tryCommit(by: Split["by"]) {
    const [listA, listB] = splitLists(instruction);
    const result = typedSafeParse(SplitSchema, {
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
        onChange={(v) => tryCommit(z.enum(["role", "direction"]).parse(v))}
        getLabel={(v) => SPLIT_BY_LABELS[v] ?? v}
      />
    </>
  );
}
