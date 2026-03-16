import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Do-si-do",
  initFormation: "improper",
  instructions: [
    {
      beats: 8,
      type: "do_si_do",
      cid: { type: "label", label: "neighbor" },
      rotations: 1.5,
    },
    {
      beats: 2,
      type: "pass_by",
      cid: { type: "label", label: "next_neighbor" },
      hand: "left",
    },
  ],
});
