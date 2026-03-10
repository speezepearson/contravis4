import { z } from "zod";

import { assertNever, buildEnumRecord } from "../../utils";
import type { LRInstructionTemplate } from "./_base";
import specialChainTemplate from "./specialChain";
import specialCourtesyTurnTemplate from "./specialCourtesyTurn";

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
