import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Swing",
  initFormation: "improper",
  instructions: [
    {
      id: "1423e7f6-5df0-4c99-83ff-e26cdb14a6a6",
      beats: 16,
      type: "swing",
      cid: { type: "label", label: "neighbor" },
      endFacing: "across",
    },
  ],
});
