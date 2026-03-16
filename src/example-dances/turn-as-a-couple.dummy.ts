import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Turn as a couple",
  initFormation: "improper",
  instructions: [
    {
      beats: 0,
      type: "face",
      direction: { type: "PureDirection", dir: "across" },
    },
    {
      beats: 4,
      type: "turn_as_a_couple",
    },
    {
      beats: 2,
      type: "pull_by",
      cid: { type: "label", label: "prev_neighbor" },
      hand: "right",
    },
  ],
});
