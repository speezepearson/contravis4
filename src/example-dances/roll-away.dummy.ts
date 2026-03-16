import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Roll away",
  initFormation: "improper",
  instructions: [
    {
      beats: 2,
      type: "roll_away",
      roller: "lark",
      rollee: { type: "label", label: "partner" },
    },
    {
      beats: 2,
      type: "roll_away",
      roller: "robin",
      rollee: { type: "label", label: "partner" },
    },
  ],
});
