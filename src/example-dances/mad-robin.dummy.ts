import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Mad robin",
  initFormation: "improper",
  instructions: [
    {
      beats: 8,
      type: "mad_robin",
      cid: { type: "label", label: "neighbor" },
      rotations: 1.5,
      whoInFront: "lark",
    },
    {
      beats: 8,
      type: "mad_robin",
      cid: { type: "label", label: "next_neighbor" },
      rotations: 1.5,
      whoInFront: "robin",
    },
  ],
});
