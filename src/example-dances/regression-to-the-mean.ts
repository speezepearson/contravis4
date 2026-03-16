import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "verified",
  url: "https://contradb.com/dances/3028",
  name: "Regression to the Mean",
  author: "Cristy Altamirano",
  initFormation: "becket",
  instructions: [
    {
      beats: 8,
      type: "slice",
      direction: "left",
    },
    {
      beats: 0,
      type: "greet_new_neighbors",
      cid: { type: "PersonInDirection", dir: "across", onlyRole: "different" },
    },
    {
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 8,
      type: "do_si_do",
      cid: { type: "label", label: "neighbor" },
      rotations: 1,
    },
    {
      beats: 8,
      type: "swing",
      cid: { type: "label", label: "neighbor" },
      endFacing: "across",
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 8,
      type: "long_lines_forward_back",
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 16,
      type: "meltdown_swing",
      cid: { type: "label", label: "partner" },
      endFacing: "across",
    },
  ],
});
