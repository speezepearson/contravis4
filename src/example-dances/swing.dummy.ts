import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Swing",
  initFormation: "improper",
  instructions: [
    {
      beats: 16,
      type: "swing",
      cid: { type: "label", label: "neighbor" },
      endFacing: "across",
    },
  ],
});
