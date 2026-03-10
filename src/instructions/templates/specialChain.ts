import { typedParse } from "../../utils";
import { LRInstructionTemplateSchema } from "./_base";

export default typedParse(LRInstructionTemplateSchema, {
  name: "special chain",
  defaultBeats: 8,
  matcher: { type: "choreographer_specified" },
  fieldsDisplay: ["robins chain with a flourish to your", { field: "matcher" }],
  keyframes: [
    // TODO: fill in real keyframes once the definition UI exists
  ],
});
