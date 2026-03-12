import { z } from "zod";

import { type ProtoId } from "../contraCore";
import { ShadowLabelSchema } from "../labels";
import { must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  PersonInDirectionVariantSchema,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator, type Segment } from "./_segment";

export const GreetShadowInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("greet_shadow"),
  beats: z.literal(0),
  label: ShadowLabelSchema,
  cid: PersonInDirectionVariantSchema,
});
export type GreetShadowInstruction = z.infer<
  typeof GreetShadowInstructionSchema
>;

export function planGreetShadow(
  instr: GreetShadowInstruction,
  dancer: Dancer,
): DancerSegment[] {
  const them = must(dancer.resolveCalledIdentifier(instr.cid));
  return [{ dur: 0, labels: () => [[instr.label, them.id]] }];
}

export const greetShadowSegments: InstructionAnimator<
  GreetShadowInstruction
> = (instr): Segment[] => [
  {
    dur: 0,
    labels: (dancer, _frac) => {
      const them = must(dancer.resolveCalledIdentifier(instr.cid));
      return [[instr.label, them.id]];
    },
  },
];

export function greetShadowAnimator(
  instr: GreetShadowInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  return animatePlans(init, who, (dancer) => planGreetShadow(instr, dancer));
}
