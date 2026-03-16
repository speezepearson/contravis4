import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) California twirl",
  initFormation: "improper",
  instructions: [
    {
      beats: 4,
      type: "california_twirl",
    },
    {
      beats: 4,
      type: "pull_by",
      cid: { type: "label", label: "partner" },
      hand: "right",
    },
  ],
});
