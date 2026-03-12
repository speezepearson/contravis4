import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  PersonInDirectionVariantSchema,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator, type Segment } from "./_segment";

export const GreetNewNeighborsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("greet_new_neighbors"),
  beats: z.literal(0),
  cid: PersonInDirectionVariantSchema,
});
export type GreetNewNeighborsInstruction = z.infer<
  typeof GreetNewNeighborsInstructionSchema
>;

export function planGreetNewNeighbors(
  instr: GreetNewNeighborsInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const neighborId = must(dancer.resolveCalledIdentifier(instr.cid)?.id, [
    { dancerId: dancer.id },
    " has no ",
    { cid: instr.cid },
    " to mark as their new neighbor",
  ]);
  return [
    {
      dur: 0,
      labels: () => [["neighbor", neighborId]],
      interactedWith: () => [neighborId],
    },
  ];
}

export const greetNewNeighborsSegments: InstructionAnimator<
  GreetNewNeighborsInstruction
> = (instr): Segment[] => [
  {
    dur: 0,
    labels: (dancer) => [
      [
        "neighbor",
        must(dancer.resolveCalledIdentifier(instr.cid)?.id, [
          { dancerId: dancer.id },
          " has no ",
          { cid: instr.cid },
          " to mark as their new neighbor",
        ]),
      ],
    ],
    interactedWith: (dancer) => [
      must(dancer.resolveCalledIdentifier(instr.cid)).id,
    ],
  },
];

export function greetNewNeighborsAnimator(
  instr: GreetNewNeighborsInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) =>
    planGreetNewNeighbors(instr, dancer),
  );
}
