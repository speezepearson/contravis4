import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  initFormation: "improper",
  instructions: [
    {
      type: "split",
      by: "role",
      larks: [
        {
          beats: 0,
          type: "face",
          direction: { type: "PureDirection", dir: "across" },
        },
      ],
      robins: [
        {
          beats: 0,
          type: "face",
          direction: { type: "PureDirection", dir: "out" },
        },
      ],
    },
    {
      beats: 0,
      type: "form_long_waves",
    },
    {
      beats: 4,
      type: "box_circulate",
    },
    {
      beats: 4,
      type: "box_circulate",
    },
    {
      beats: 4,
      type: "box_circulate",
    },
    {
      beats: 4,
      type: "box_circulate",
    },
  ],
});
