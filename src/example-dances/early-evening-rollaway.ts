import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "verified",
  url: "https://contradb.com/dances/2593",
  name: "Early Evening Rollaway",
  author: "Bob Isaacs",
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
    // A2: right left through (8)
    {
      beats: 8,
      type: "right_left_through",
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // A2: ladles chain (8)
    {
      beats: 8,
      type: "robins_chain",
      cid: { type: "label", label: "partner" },
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // B1: balance the ring (4)
    {
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      beats: 4,
      type: "balance_the_ring",
    },
    // B1: gentlespoons roll away neighbors with a half sashay across the set (4)
    {
      beats: 4,
      type: "roll_away",
      roller: "lark",
      rollee: { type: "label", label: "neighbor" },
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
