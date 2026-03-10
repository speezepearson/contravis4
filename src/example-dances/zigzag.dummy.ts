import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Zigzag",
  initFormation: "improper",
  instructions: [
    {
      id: "89c84fc6-f59f-44fe-aa0f-5feb58ecc4a8",
      beats: 8,
      type: "zig_zag",
      dir: "left",
      nZigs: 2,
    },
    {
      id: "260297dd-6597-42bd-90b0-bdb7d5d085b2",
      beats: 0,
      type: "face",
      direction: "behind",
    },
    {
      id: "4638e4a2-e186-4780-a116-8b2b4f8da476",
      beats: 8,
      type: "zig_zag",
      dir: "right",
      nZigs: 2,
    },
    {
      id: "12ab22e1-713a-4147-976c-7f4345105aba",
      beats: 0,
      type: "face",
      direction: "behind",
    },
  ],
});
