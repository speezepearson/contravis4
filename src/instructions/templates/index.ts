import type { LRInstructionTemplate } from "../templatedLRInstruction";
import { specialChainTemplate } from "./specialChain";

export const allLRTemplates = {
  specialChain: specialChainTemplate,
} satisfies Record<string, LRInstructionTemplate>;

export type TemplateId = keyof typeof allLRTemplates;

export const templateIds = Object.keys(allLRTemplates) as [
  TemplateId,
  ...TemplateId[],
];
