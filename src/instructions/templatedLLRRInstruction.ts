import { z } from "zod";

import { type Beats } from "../contraCore";
import { ccwRadsBetween, lerpFacing, NORTH } from "../geometry";
import { lerpVectors, must } from "../utils";
import { Dancer } from "../worldState";
import { type CalledIdentifier, instructionBaseSchemaFields } from "./_base";
import type { InstructionAnimator, Segment } from "./_segment";
import { ChoreographerSpecifiedLRInstructionFieldsSchema } from "./templates/_base";
import { allLLRRTemplates, LLRRTemplateIdSchema } from "./templates/index";

// ── Instruction schema ───────────────────────────────────────────────────

export const TemplatedLLRRInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("templated_llrr"),
  templateId: LLRRTemplateIdSchema,
  fields: ChoreographerSpecifiedLRInstructionFieldsSchema,
});
export type TemplatedLLRRInstruction = z.infer<
  typeof TemplatedLLRRInstructionSchema
>;

// ── Coordinate transforms ────────────────────────────────────────────────

import type { Vector } from "vecti";

function relPosToWorld(
  relPos: Vector,
  origPos: Vector,
  origFacing: Vector,
): Vector {
  const angle = ccwRadsBetween(NORTH, origFacing);
  return origPos.add(relPos.rotateByRadians(angle));
}

function relFacingToWorld(relFacing: number, origFacing: Vector): Vector {
  return origFacing.rotateByRadians(relFacing);
}

// ── Animator ─────────────────────────────────────────────────────────────

export const templatedLLRRSegments: InstructionAnimator<
  TemplatedLLRRInstruction
> = (instr, init) => {
  const template = allLLRRTemplates[instr.templateId];

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

  const getInitMatch = (d: Dancer) =>
    d.at(init).resolveMatch(matcher, { roles: "different" });
  void getInitMatch;

  if (template.keyframes.length === 0) {
    return [];
  }

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
        const worldTarget = relPosToWorld(state.relPos, orig.pos, orig.facing);
        return lerpVectors(dancer.pos, worldTarget, frac);
      },
      facing: (dancer, frac) => {
        const state = kf.states[dancer.protoId];
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
