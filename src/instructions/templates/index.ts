import { z } from "zod";

import { assertNever, buildEnumRecord } from "../../utils";
import type { LRInstructionTemplate } from "../templatedLRInstruction";
import { specialChainTemplate } from "./specialChain";

export const TemplateIdSchema = z.enum(["specialChain"]);
export type TemplateId = z.infer<typeof TemplateIdSchema>;

export const templateIds = TemplateIdSchema.options;

export const allLRTemplates: Record<TemplateId, LRInstructionTemplate> =
  buildEnumRecord(TemplateIdSchema, (id): LRInstructionTemplate => {
    switch (id) {
      case "specialChain":
        return specialChainTemplate;
      default:
        assertNever(id);
    }
  });
