import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Down the hall",
  initFormation: "improper",
  instructions: [
    {
      beats: 16,
      type: "swing",
      cid: { type: "label", label: "neighbor" },
      endFacing: "down",
    },
    {
      beats: 6,
      type: "down_the_hall",
      distance: 1.5,
    },
    {
      beats: 2,
      type: "turn_as_a_couple",
    },
    {
      beats: 6,
      type: "up_the_hall",
      distance: 1.5,
    },
    {
      beats: 2,
      type: "bend_the_line",
    },
    {
      beats: 0,
      type: "face",
      direction: { type: "TowardsLabel", label: "opposite" },
    },
    {
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 4,
    },
  ],
});
