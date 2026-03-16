import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Box the Gnat",
  initFormation: "improper",
  instructions: [
    {
      beats: 4,
      type: "box_the_gnat",
      cid: { type: "label", label: "neighbor" },
    },
    {
      beats: 4,
      type: "box_the_gnat",
      cid: { type: "label", label: "neighbor" },
    },
  ],
});
