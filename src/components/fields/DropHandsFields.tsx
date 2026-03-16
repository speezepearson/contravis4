import type z from "zod";

import type { AtomicInstruction } from "../../instructions/_atomic";
import { calledIdentifierToKey, labelId } from "../../instructions/_base";
import {
  type DropHandsInstruction,
  DropHandsInstructionSchema,
} from "../../instructions/dropHands";
import { LabelSchema } from "../../labels";
import { typedSafeParse } from "../../utils";
import type { SubFormProps } from "../fieldUtils";
import { DROP_WHICH_LABELS, DROP_WHICH_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

function whichToKey(which: DropHandsInstruction["which"]): string {
  if (typeof which === "string") return which;
  return calledIdentifierToKey(which);
}

function whichFromKey(key: string): DropHandsInstruction["which"] {
  if (key === "both" || key === "left" || key === "right") return key;
  return DropHandsInstructionSchema.shape.which.parse(
    labelId(LabelSchema.parse(key)),
  );
}

export function DropHandsFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "drop_hands" }>;
}) {
  function tryCommit(
    overrides: Partial<z.input<typeof DropHandsInstructionSchema>>,
  ) {
    const result = typedSafeParse(DropHandsInstructionSchema, {
      beats: 0,
      type: "drop_hands",
      which: instruction.which,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  return (
    <>
      <InlineDropdown
        options={[...DROP_WHICH_OPTIONS]}
        value={whichToKey(instruction.which)}
        onChange={(v) =>
          tryCommit({
            which: whichFromKey(v),
          })
        }
        getLabel={(v) => DROP_WHICH_LABELS[v] ?? v}
      />
    </>
  );
}
