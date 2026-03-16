import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  initFormation: "improper",
  instructions: [
    {
      beats: 4,
      type: "balance",
      cid: { type: "label", label: "partner" },
    },
  ],
});
