import { z } from "zod";

import { type Beats } from "../contraCore";
import { lerpFacing } from "../geometry";
import { lerpVectors, must } from "../utils";
import { Dancer } from "../worldState";
import { type CalledIdentifier, instructionBaseSchemaFields } from "./_base";
import type { InstructionAnimator, Segment } from "./_segment";
import { ChoreographerSpecifiedLRInstructionFieldsSchema } from "./templates/_base";
import {
  relFacingToWorldWithBasis,
  relPosToWorldWithBasis,
  resolveInitBasis,
} from "./templates/_basisResolution";
import { allLRTemplates, LRTemplateIdSchema } from "./templates/index";

// ── Instruction schema ───────────────────────────────────────────────────

export const TemplatedLRInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("templated_lr"),
  templateId: LRTemplateIdSchema,
  fields: ChoreographerSpecifiedLRInstructionFieldsSchema,
});
export type TemplatedLRInstruction = z.infer<
  typeof TemplatedLRInstructionSchema
>;

// ── Animator ─────────────────────────────────────────────────────────────

export const templatedLRSegments: InstructionAnimator<
  TemplatedLRInstruction
> = (instr, init) => {
  const template = allLRTemplates[instr.templateId];

  const resolveMatcher = (): CalledIdentifier => {
    switch (template.matcher.type) {
      case "hardcoded":
        return template.matcher.cid;
      case "choreographer_specified":
        return must(instr.fields.matcher, [
          "choreographer-specified matcher is required for template ",
          template.name,
        ]);
    }
  };

  const matcher = resolveMatcher();

  // Compute the match for each dancer at init time.
  // Not currently used in keyframe interpolation, but available for future use.
  const getInitMatch = (d: Dancer) =>
    d.at(init).resolveMatch(matcher, { roles: "different" });
  void getInitMatch;

  if (template.keyframes.length === 0) {
    return [];
  }

  // Pre-resolve basis vectors for each role at init time.
  const basisCache = new Map<
    string,
    { xBasis: import("vecti").Vector; yBasis: import("vecti").Vector }
  >();
  const getBasis = (dancer: Dancer) => {
    const key = dancer.role;
    let cached = basisCache.get(key);
    if (!cached) {
      cached = resolveInitBasis(template.basis, key, dancer.id, init);
      basisCache.set(key, cached);
    }
    return cached;
  };

  // Scale keyframe times to fit the instruction's beats
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
        const state = kf.states[dancer.role];
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
        const state = kf.states[dancer.role];
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
