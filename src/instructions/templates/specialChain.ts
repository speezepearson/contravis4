import { typedParse } from "../../utils";
import { LRInstructionTemplateSchema } from "./_base";

export default typedParse(LRInstructionTemplateSchema, {
  name: "special chain",
  defaultBeats: 8,
  basis: {
    x: { type: "PureDirection", dir: "on_right" },
    y: { type: "PureDirection", dir: "in_front" },
  },
  fieldsDisplay: ["robins chain with a flourish to your", { field: "basis_x" }],
  keyframes: [
    // TODO: fill in real keyframes once the definition UI exists
  ],
});
