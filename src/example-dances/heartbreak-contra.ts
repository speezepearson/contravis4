import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "verified",
  name: "Heartbreak Contra (A2 ring balance)",
  author: "Dugan Murphy",
  initFormation: "improper",
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
      beats: 12,
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
      type: "split",
      by: "role",
      larks: [
        {
          beats: 8,
          type: "allemande",
          cid: { type: "label", label: "opposite" },
          handedness: "left",
          rotations: 1.5,
        },
      ],
      robins: [],
    },
    {
      beats: 8,
      type: "swing",
      cid: { type: "label", label: "partner" },
      endFacing: "across",
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
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      beats: 4,
      type: "balance_the_ring",
    },
    {
      beats: 4,
      type: "pass_by",
      cid: { type: "label", label: "neighbor" },
      hand: "right",
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
  ],
});
