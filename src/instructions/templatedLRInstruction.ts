import { z } from "zod";

import type { ProtoId } from "../contraCore";
import { Dancer, type WorldState } from "../worldState";
import { type ContraAnimation, instructionBaseSchemaFields } from "./_base";
import { animatePlans } from "./_plan";
import type { InstructionAnimator } from "./_segment";
import { ChoreographerSpecifiedFieldsSchema } from "./templates/_base";
import { resolveTemplateBasis } from "./templates/_basisResolution";
import {
  buildKeyframePlans,
  buildKeyframeSegments,
} from "./templates/_keyframeSegments";
import { allLRTemplates, LRTemplateIdSchema } from "./templates/index";

// ── Instruction schema ───────────────────────────────────────────────────

export const TemplatedLRInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("templated_lr"),
  templateId: LRTemplateIdSchema,
  fields: ChoreographerSpecifiedFieldsSchema,
});
export type TemplatedLRInstruction = z.infer<
  typeof TemplatedLRInstructionSchema
>;

// ── Animator ─────────────────────────────────────────────────────────────

export const templatedLRSegments: InstructionAnimator<
  TemplatedLRInstruction
> = (instr, init) => {
  const template = allLRTemplates[instr.templateId];

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
      cached = resolveTemplateBasis(
        template.basis,
        instr.fields,
        dancer.at(init),
      );
      basisCache.set(key, cached);
    }
    return cached;
  };

  // Scale keyframe durations to fit the instruction's beats
  const totalKfDur = template.keyframes.reduce((sum, kf) => sum + kf.dur, 0);
  const scale = totalKfDur > 0 ? instr.beats / totalKfDur : 1;

  return buildKeyframeSegments(
    template.keyframes,
    init,
    scale,
    (dancer) => dancer.role,
    getBasis,
  );
};

export function templatedLRAnimator(
  instr: TemplatedLRInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const template = allLRTemplates[instr.templateId];

  if (template.keyframes.length === 0) {
    return animatePlans(init, who, () => []);
  }

  const basisCache = new Map<
    string,
    { xBasis: import("vecti").Vector; yBasis: import("vecti").Vector }
  >();
  const getBasis = (dancer: Dancer) => {
    const key = dancer.role;
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

  return animatePlans(
    init,
    who,
    buildKeyframePlans(
      template.keyframes,
      init,
      scale,
      (dancer) => dancer.role,
      getBasis,
    ),
  );
}
