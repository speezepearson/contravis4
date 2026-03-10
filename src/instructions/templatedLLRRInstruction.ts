import { z } from "zod";

import { type Beats } from "../contraCore";
import { lerpFacing } from "../geometry";
import { lerpVectors } from "../utils";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields } from "./_base";
import type { InstructionAnimator, Segment } from "./_segment";
import { ChoreographerSpecifiedFieldsSchema } from "./templates/_base";
import {
  relFacingToWorldWithBasis,
  relPosToWorldWithBasis,
  resolveTemplateBasis,
} from "./templates/_basisResolution";
import { allLLRRTemplates, LLRRTemplateIdSchema } from "./templates/index";

// ── Instruction schema ───────────────────────────────────────────────────

export const TemplatedLLRRInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("templated_llrr"),
  templateId: LLRRTemplateIdSchema,
  fields: ChoreographerSpecifiedFieldsSchema,
});
export type TemplatedLLRRInstruction = z.infer<
  typeof TemplatedLLRRInstructionSchema
>;

// ── Animator ─────────────────────────────────────────────────────────────

export const templatedLLRRSegments: InstructionAnimator<
  TemplatedLLRRInstruction
> = (instr, init) => {
  const template = allLLRRTemplates[instr.templateId];

  if (template.keyframes.length === 0) {
    return [];
  }

  // Pre-resolve basis vectors for each proto dancer at init time.
  const basisCache = new Map<
    string,
    { xBasis: import("vecti").Vector; yBasis: import("vecti").Vector }
  >();
  const getBasis = (dancer: Dancer) => {
    const key = dancer.protoId;
    let cached = basisCache.get(key);
    if (!cached) {
      cached = resolveTemplateBasis(
        template.basis,
        instr.fields,
        dancer.at(init),
      );
      basisCache.set(key, cached);
    }
    return cached;
  };

  const lastKfT = template.keyframes[template.keyframes.length - 1].t;
  const scale = lastKfT > 0 ? instr.beats / lastKfT : 1;

  const segments: Segment[] = [];
  let prevT: Beats = 0;

  for (let i = 0; i < template.keyframes.length; i++) {
    const kf = template.keyframes[i];
    const scaledT = kf.t * scale;
    const dur = scaledT - prevT;

    segments.push({
      dur,
      position: (dancer, frac) => {
        const state = kf.states[dancer.protoId];
        if (!state) return dancer.pos;

        const orig = dancer.at(init);
        const { xBasis, yBasis } = getBasis(dancer);
        const worldTarget = relPosToWorldWithBasis(
          state.relPos,
          orig.pos,
          xBasis,
          yBasis,
        );
        return lerpVectors(dancer.pos, worldTarget, frac);
      },
      facing: (dancer, frac) => {
        const state = kf.states[dancer.protoId];
        if (!state) return dancer.facing;

        const { yBasis } = getBasis(dancer);
        const worldFacing = relFacingToWorldWithBasis(state.relFacing, yBasis);
        return lerpFacing(dancer.facing, worldFacing, frac);
      },
    });

    prevT = scaledT;
  }

  return segments;
};
