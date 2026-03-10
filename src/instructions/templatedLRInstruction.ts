import type { Vector } from "vecti";
import { z } from "zod";

import { type Beats } from "../contraCore";
import { ccwRadsBetween, lerpFacing, NORTH } from "../geometry";
import { lerpVectors, must } from "../utils";
import { Dancer } from "../worldState";
import { type CalledIdentifier, instructionBaseSchemaFields } from "./_base";
import type { InstructionAnimator, Segment } from "./_segment";
import { ChoreographerSpecifiedLRInstructionFieldsSchema } from "./templates/_base";
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

// ── Coordinate transforms ────────────────────────────────────────────────

/**
 * Convert a relPos (in the dancer's initial coordinate system where the
 * dancer's initial facing = local "north" / +y) into world coordinates.
 */
function relPosToWorld(
  relPos: Vector,
  origPos: Vector,
  origFacing: Vector,
): Vector {
  const angle = ccwRadsBetween(NORTH, origFacing);
  return origPos.add(relPos.rotateByRadians(angle));
}

/**
 * Convert a relFacing (a rotation in radians from the dancer's initial facing)
 * into a world facing vector.
 */
function relFacingToWorld(relFacing: number, origFacing: Vector): Vector {
  return origFacing.rotateByRadians(relFacing);
}

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
        const role = dancer.role;
        const state = kf.states[role];
        if (!state) return dancer.pos;

        const orig = dancer.at(init);
        const worldTarget = relPosToWorld(state.relPos, orig.pos, orig.facing);
        return lerpVectors(dancer.pos, worldTarget, frac);
      },
      facing: (dancer, frac) => {
        const role = dancer.role;
        const state = kf.states[role];
        if (!state) return dancer.facing;

        const orig = dancer.at(init);
        const worldFacing = relFacingToWorld(state.relFacing, orig.facing);
        return lerpFacing(dancer.facing, worldFacing, frac);
      },
    });

    prevT = scaledT;
  }

  return segments;
};
