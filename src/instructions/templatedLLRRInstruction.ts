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

  return buildKeyframeSegments(
    template.keyframes,
    init,
    scale,
    (dancer) => dancer.protoId,
    getBasis,
  );
};

export function templatedLLRRAnimator(
  instr: TemplatedLLRRInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const template = allLLRRTemplates[instr.templateId];

  if (template.keyframes.length === 0) {
    return animatePlans(init, who, () => []);
  }

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

  return animatePlans(
    init,
    who,
    buildKeyframePlans(
      template.keyframes,
      init,
      scale,
      (dancer) => dancer.protoId,
      getBasis,
    ),
  );
}
