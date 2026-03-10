import { typedParse } from "../../utils";
import { LLRRInstructionTemplateSchema } from "./_base";

export default typedParse(LLRRInstructionTemplateSchema, {
  name: "special star",
  defaultBeats: 8,
  matcher: { type: "hardcoded", cid: "partner" },
  fieldsDisplay: [],
  keyframes: [
    // TODO: fill in real keyframes once the definition UI supports LLRR
  ],
});
