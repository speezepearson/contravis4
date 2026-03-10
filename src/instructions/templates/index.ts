import { z } from "zod";

import { assertNever, buildEnumRecord } from "../../utils";
import type { LLRRInstructionTemplate, LRInstructionTemplate } from "./_base";
import specialChainTemplate from "./specialChain";
import specialCourtesyTurnTemplate from "./specialCourtesyTurn";
import specialHeyTemplate from "./specialHey";
import specialStarTemplate from "./specialStar";

export const LRTemplateIdSchema = z.enum([
  "specialChain",
  "specialCourtesyTurn",
]);
export type LRTemplateId = z.infer<typeof LRTemplateIdSchema>;

export const templateIds = LRTemplateIdSchema.options;

export const allLRTemplates: Record<LRTemplateId, LRInstructionTemplate> =
  buildEnumRecord(LRTemplateIdSchema, (id): LRInstructionTemplate => {
    switch (id) {
      case "specialChain":
        return specialChainTemplate;
      case "specialCourtesyTurn":
        return specialCourtesyTurnTemplate;
      default:
        assertNever(id);
    }
  });

export const LLRRTemplateIdSchema = z.enum(["specialStar", "specialHey"]);
export type LLRRTemplateId = z.infer<typeof LLRRTemplateIdSchema>;

export const allLLRRTemplates: Record<LLRRTemplateId, LLRRInstructionTemplate> =
  buildEnumRecord(LLRRTemplateIdSchema, (id): LLRRInstructionTemplate => {
    switch (id) {
      case "specialStar":
        return specialStarTemplate;
      case "specialHey":
        return specialHeyTemplate;
      default:
        assertNever(id);
    }
  });
