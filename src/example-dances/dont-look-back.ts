import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "verified",
  name: "Don't Look Back",
  author: "Kenny Greer",
  initFormation: "becket",
  instructions: [
    {
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      beats: 4,
      type: "balance_the_ring",
    },
    {
      beats: 4,
      type: "petronella",
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
      type: "take_hands_in_rings",
    },
    {
      beats: 4,
      type: "balance_the_ring",
    },
    {
      beats: 4,
      type: "petronella",
    },
    {
      beats: 8,
      type: "allemande",
      cid: { type: "label", label: "partner" },
      handedness: "left",
      rotations: 1.5,
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      type: "split",
      by: "role",
      larks: [
        {
          beats: 2,
          type: "pass_by",
          cid: { type: "label", label: "opposite" },
          hand: "right",
        },
      ],
      robins: [],
    },
    {
      beats: 14,
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
      beats: 16,
      type: "give_and_take_into_swing",
      cid: { type: "label", label: "partner" },
      drawerRole: "robin",
      endFacing: "across",
    },
  ],
});
