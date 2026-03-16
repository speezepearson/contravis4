import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Circle",
  initFormation: "improper",
  instructions: [
    {
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      beats: 8,
      type: "circle",
      direction: "right",
      nPlaces: 3,
    },
  ],
});
