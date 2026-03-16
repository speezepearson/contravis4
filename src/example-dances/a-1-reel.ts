import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "verified",
  url: "https://contradb.com/dances/2267",
  name: "A-1 Reel",
  author: "Chris Weiler",
  initFormation: "becket_ccw",
  instructions: [
    {
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      beats: 4,
      type: "balance_the_ring",
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 4,
      type: "california_twirl",
    },
    {
      beats: 0,
      type: "greet_new_neighbors",
      cid: {
        type: "PersonInDirection",
        dir: "in_front",
        onlyRole: "different",
      },
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 16,
      type: "balance_and_swing",
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
      type: "right_left_through",
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      type: "split",
      by: "role",
      larks: [],
      robins: [
        {
          beats: 8,
          type: "allemande",
          cid: { type: "label", label: "opposite" },
          handedness: "right",
          rotations: 1.5,
        },
      ],
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 16,
      type: "balance_and_swing",
      cid: { type: "label", label: "partner" },
      endFacing: "across",
    },
  ],
});
