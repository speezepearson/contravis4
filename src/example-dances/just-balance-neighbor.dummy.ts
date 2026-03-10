import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  initFormation: "improper",
  instructions: [
    {
      id: "34b7ddcb-2df6-4354-8c83-ee01e3a84f3a",
      beats: 4,
      type: "balance",
      cid: { type: "label", label: "neighbor" },
    },
  ],
});
