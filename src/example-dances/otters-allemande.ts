import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "verified",
  name: "Otter's Allemande",
  author: "Ramya Rajan",
  initFormation: "improper",
  instructions: [
    {
      beats: 0,
      type: "take_hands",
      cid: { type: "label", label: "neighbor" },
      hand: "right",
    },
    {
      beats: 4,
      type: "balance",
      cid: { type: "label", label: "neighbor" },
    },
    {
      beats: 4,
      type: "box_the_gnat",
      cid: { type: "label", label: "neighbor" },
    },
    {
      beats: 0,
      type: "drop_hands",
      which: { type: "label", label: "neighbor" },
    },
    {
      beats: 8,
      type: "do_si_do",
      cid: { type: "label", label: "neighbor" },
      rotations: 1.25,
    },
    {
      beats: 0,
      type: "form_short_waves",
    },
    {
      beats: 4,
      type: "balance",
      cid: { type: "label", label: "neighbor" },
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 2,
      type: "allemande",
      cid: { type: "label", label: "neighbor" },
      handedness: "right",
      rotations: 0.5,
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
          beats: 2,
          type: "allemande",
          cid: { type: "label", label: "opposite" },
          handedness: "left",
          rotations: 0.5,
        },
      ],
    },
    {
      beats: 8,
      type: "swing",
      cid: { type: "label", label: "partner" },
      endFacing: "across",
    },
    {
      beats: 16,
      type: "give_and_take_into_swing",
      cid: { type: "label", label: "neighbor" },
      drawerRole: "lark",
      endFacing: "across",
    },
    {
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      beats: 16,
      type: "square_through",
      nPullBys: 4,
      firstHand: "right",
      cid1: { type: "label", label: "partner" },
      cid2: { type: "label", label: "neighbor" },
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
