import { z } from "zod";

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

  const totalKfDur = template.keyframes.reduce((sum, kf) => sum + kf.dur, 0);
  const scale = totalKfDur > 0 ? instr.beats / totalKfDur : 1;

  const segments: Segment[] = [];

  for (let i = 0; i < template.keyframes.length; i++) {
    const kf = template.keyframes[i];
    const dur = kf.dur * scale;

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
  }

  return segments;
};
