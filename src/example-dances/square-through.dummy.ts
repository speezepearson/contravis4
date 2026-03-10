import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Square through",
  initFormation: "improper",
  instructions: [
    {
      id: "e927993b-3243-4c47-820d-be321715a023",
      beats: 16,
      type: "square_through",
      nPullBys: 4,
      firstHand: "right",
      cid1: { type: "label", label: "neighbor" },
      cid2: { type: "label", label: "partner" },
    },
  ],
});
