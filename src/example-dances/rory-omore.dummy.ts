import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Rory O'More",
  initFormation: "improper",
  instructions: [
    {
      beats: 4,
      type: "allemande",
      cid: { type: "label", label: "neighbor" },
      handedness: "right",
      rotations: 0.75,
    },
    {
      beats: 0,
      type: "form_short_waves",
    },
    {
      beats: 4,
      type: "balance",
      cid: { type: "label", label: "neighbor" },
    },
    {
      beats: 4,
      type: "rory_o_more",
      direction: "right",
    },
    {
      beats: 0,
      type: "form_short_waves",
    },
    {
      beats: 4,
      type: "balance",
      cid: { type: "label", label: "neighbor" },
    },
    {
      beats: 4,
      type: "rory_o_more",
      direction: "left",
    },
    {
      beats: 8,
      type: "allemande",
      cid: { type: "label", label: "neighbor" },
      handedness: "right",
      rotations: 1.25,
    },
    {
      beats: 2,
      type: "pull_by",
      cid: { type: "label", label: "neighbor" },
      hand: "right",
    },
    {
      beats: 1,
      type: "step",
      direction: { type: "PureDirection", dir: "in_front" },
      distance: 0.25,
      facing: { type: "PureDirection", dir: "in_front" },
    },
  ],
});
