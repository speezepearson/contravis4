import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "preliminary",
  url: "https://contradb.com/dances/2283",
  name: "It Started on Facebook",
  author: "Michael Fuerst and Nicholas Rockstroh",
  initFormation: "becket",
  instructions: [
    {
      beats: 8,
      type: "right_left_through",
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 8,
      type: "robins_chain",
      cid: { type: "label", label: "neighbor" },
    },
    {
      beats: 8,
      type: "star",
      direction: "left",
      nPlaces: 3,
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 0,
      type: "greet_new_neighbors",
      cid: { type: "PersonInDirection", dir: "across", onlyRole: "different" },
    },
    {
      beats: 8,
      type: "do_si_do",
      cid: { type: "label", label: "partner" },
      rotations: 1,
    },
    {
      beats: 0,
      type: "form_long_waves",
    },
    {
      beats: 4,
      type: "balance",
      cid: { type: "PersonInDirection", dir: "across", onlyRole: "different" },
    },
    {
      beats: 4,
      type: "box_circulate",
    },
    {
      beats: 4,
      type: "balance",
      cid: { type: "PersonInDirection", dir: "across", onlyRole: "different" },
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 4,
      type: "single_file_promenade",
      direction: "right",
      nPlaces: 3,
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 16,
      type: "swing",
      cid: { type: "label", label: "partner" },
      endFacing: "across",
    },
  ],
});
