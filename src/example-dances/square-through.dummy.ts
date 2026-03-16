import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Square through",
  initFormation: "improper",
  instructions: [
    {
      beats: 16,
      type: "square_through",
      nPullBys: 4,
      firstHand: "right",
      cid1: { type: "label", label: "neighbor" },
      cid2: { type: "label", label: "partner" },
    },
  ],
});
