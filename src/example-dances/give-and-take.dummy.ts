import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Give and take",
  initFormation: "improper",
  instructions: [
    {
      beats: 8,
      type: "give_and_take_into_swing",
      cid: { type: "label", label: "partner" },
      drawerRole: "lark",
      endFacing: "across",
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
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
      nPlaces: 3,
    },
  ],
});
