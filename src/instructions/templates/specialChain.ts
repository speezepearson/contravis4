import type { LRInstructionTemplate } from "../templatedLRInstruction";

export const specialChainTemplate: LRInstructionTemplate = {
  name: "special chain",
  defaultBeats: 8,
  matcher: { type: "choreographer_specified" },
  fieldsDisplay: ["robins chain with a flourish to your", { field: "matcher" }],
  keyframes: [
    // TODO: fill in real keyframes once the definition UI exists
  ],
};
