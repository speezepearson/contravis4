import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Zigzag",
  initFormation: "improper",
  instructions: [
    {
      beats: 8,
      type: "zig_zag",
      dir: "left",
      nZigs: 2,
    },
    {
      beats: 0,
      type: "face",
      direction: { type: "PureDirection", dir: "behind" },
    },
    {
      beats: 8,
      type: "zig_zag",
      dir: "right",
      nZigs: 2,
    },
    {
      beats: 0,
      type: "face",
      direction: { type: "PureDirection", dir: "behind" },
    },
  ],
});
