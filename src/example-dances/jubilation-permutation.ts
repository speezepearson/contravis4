import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "preliminary",
  url: "https://contradb.com/dances/2344",
  name: "Jubilation Permutation",
  author: "Cary Ravitz",
  initFormation: "improper",
  instructions: [
    // A1: neighbors balance & swing (16)
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
    // A2: gentlespoons allemande left 1½ (8)
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
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // A2: partners swing (8)
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
    // B1: gentlespoons start a half hey - lefts in center, rights on ends (8)
    {
      beats: 8,
      type: "hey",
      full: false,
      centerRole: "lark",
      centerHand: "left",
    },
    // B1: partners swing (8)
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
    // B2: circle left 3 places (6)
    {
      beats: 6,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    // B2: pass through (2) ⁋
    {
      beats: 2,
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
    // B2: next neighbors do si do (8)
    {
      beats: 8,
      type: "do_si_do",
      cid: { type: "label", label: "neighbor" },
      rotations: 1.0,
    },
  ],
});
