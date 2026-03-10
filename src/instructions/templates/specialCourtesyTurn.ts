import { typedParse } from "../../utils";
import { LRInstructionTemplateSchema } from "./_base";

export default typedParse(LRInstructionTemplateSchema, {
  name: "special courtesy turn",
  defaultBeats: 4,
  matcher: { type: "hardcoded", cid: "partner" },
  fieldsDisplay: ["courtesy turn your", { field: "matcher" }],
  keyframes: [
    // TODO: fill in real keyframes once the definition UI exists
  ],
});
