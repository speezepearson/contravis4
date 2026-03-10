import { typedParse } from "../../utils";
import { LRInstructionTemplateSchema } from "./_base";

export default typedParse(LRInstructionTemplateSchema, {
  name: "special chain",
  defaultBeats: 8,
  basis: { x: "on_right", y: "in_front" },
  fieldsDisplay: ["robins chain with a flourish to your", { field: "basis_x" }],
  keyframes: [
    // TODO: fill in real keyframes once the definition UI exists
  ],
});
