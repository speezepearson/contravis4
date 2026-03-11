import type z from "zod";

import { HandSchema, otherHand } from "../../contraCore";
import type { AtomicInstruction } from "../../instructions/_atomic";
import { SquareThroughInstructionSchema } from "../../instructions/squareThrough";
import { typedSafeParse } from "../../utils";
import { CalledIdentifierEditor } from "../CalledIdentifierEditor";
import type { SubFormProps } from "../fieldUtils";
import { HAND_OPTIONS } from "../fieldUtils";
import { InlineDropdown } from "../InlineDropdown";

const N_PULL_BYS_OPTIONS = ["2", "3", "4"] as const;
const safeStringNPullBys = { 2: "2", 3: "3", 4: "4" } as const;

export function SquareThroughFields({
  instruction,
  onChange,
  onInvalid,
}: SubFormProps & {
  instruction: Extract<AtomicInstruction, { type: "square_through" }>;
}) {
  const { id } = instruction;

  function tryCommit(
    overrides: Partial<z.input<typeof SquareThroughInstructionSchema>>,
  ) {
    const result = typedSafeParse(SquareThroughInstructionSchema, {
      id,
      type: "square_through",
      beats: instruction.beats,
      nPullBys: instruction.nPullBys,
      firstHand: instruction.firstHand,
      cid1: instruction.cid1,
      cid2: instruction.cid2,
      ...overrides,
    });
    if (result.success) onChange(result.data);
    else onInvalid?.();
  }

  const secondHand = otherHand(instruction.firstHand);

  return (
    <>
      <InlineDropdown<(typeof N_PULL_BYS_OPTIONS)[number]>
        options={N_PULL_BYS_OPTIONS}
        value={safeStringNPullBys[instruction.nPullBys]}
        onChange={(v) =>
          tryCommit({
            nPullBys: SquareThroughInstructionSchema.shape.nPullBys.parse(
              Number(v),
            ),
          })
        }
        getLabel={(v) => v}
      />
      {": "}
      <CalledIdentifierEditor
        value={instruction.cid1}
        onChange={(cid1) => tryCommit({ cid1 })}
      />
      {` pull by ${instruction.firstHand}, `}
      <CalledIdentifierEditor
        value={instruction.cid2}
        onChange={(cid2) => tryCommit({ cid2 })}
      />
      {` pull by ${secondHand}, `}
      <InlineDropdown
        options={HAND_OPTIONS}
        value={instruction.firstHand}
        onChange={(v) => tryCommit({ firstHand: HandSchema.parse(v) })}
        getLabel={() => "..."}
      />
    </>
  );
}
