import type { LRInstructionTemplate } from "../templatedLRInstruction";
import { specialChainTemplate } from "./specialChain";

export const allLRTemplates: Record<string, LRInstructionTemplate> = {
  specialChain: specialChainTemplate,
};
