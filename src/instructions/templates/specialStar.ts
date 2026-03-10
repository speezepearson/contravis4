import { typedParse } from "../../utils";
import { LLRRInstructionTemplateSchema } from "./_base";

export default typedParse(LLRRInstructionTemplateSchema, {
  name: "special star",
  defaultBeats: 8,
  basis: {
    x: { type: "PureDirection", dir: "on_right" },
    y: { type: "PureDirection", dir: "in_front" },
  },
  fieldsDisplay: [],
  keyframes: [
    // TODO: fill in real keyframes once the definition UI supports LLRR
  ],
});
