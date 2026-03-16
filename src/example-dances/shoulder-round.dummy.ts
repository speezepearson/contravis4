import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Shoulder round",
  initFormation: "improper",
  instructions: [
    {
      beats: 8,
      type: "shoulder_round",
      cid: { type: "label", label: "neighbor" },
      handedness: "right",
      rotations: 1.25,
    },
    {
      beats: 8,
      type: "shoulder_round",
      cid: { type: "label", label: "next_neighbor" },
      handedness: "left",
      rotations: 0.75,
    },
    {
      beats: 16,
      type: "swing",
      cid: { type: "label", label: "neighbor" },
      endFacing: "across",
    },
  ],
});
