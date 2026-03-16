import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  name: "Pearson Square Through",
  author: "Ramya Rajan and Spencer Pearson",
  initFormation: "improper",
  status: "verified",
  instructions: [
    {
      type: "split",
      by: "role",
      larks: [],
      robins: [
        {
          beats: 0,
          type: "face",
          direction: { type: "TowardsLabel", label: "opposite" },
        },
        {
          beats: 0,
          type: "take_hands",
          cid: { type: "label", label: "opposite" },
          hand: "right",
        },
        {
          beats: 3.5,
          type: "balance",
          cid: { type: "label", label: "opposite" },
        },
        {
          beats: 2.5,
          type: "pull_by",
          cid: { type: "label", label: "opposite" },
          hand: "right",
        },
        {
          beats: 0,
          type: "face",
          direction: { type: "PureDirection", dir: "across" },
        },
      ],
    },
    {
      beats: 2,
      type: "pull_by",
      cid: { type: "label", label: "neighbor" },
      hand: "left",
    },
    {
      type: "split",
      by: "role",
      larks: [
        {
          beats: 0,
          type: "face",
          direction: { type: "TowardsLabel", label: "opposite" },
        },
        {
          beats: 0,
          type: "take_hands",
          cid: { type: "label", label: "opposite" },
          hand: "right",
        },
        {
          beats: 3.5,
          type: "balance",
          cid: { type: "label", label: "opposite" },
        },
        {
          beats: 2.5,
          type: "pull_by",
          cid: { type: "label", label: "opposite" },
          hand: "right",
        },
        {
          beats: 0,
          type: "face",
          direction: { type: "TowardsLabel", label: "opposite" },
        },
      ],
      robins: [
        {
          beats: 0,
          type: "face",
          direction: { type: "PureDirection", dir: "across" },
        },
      ],
    },
    {
      beats: 2,
      type: "pull_by",
      cid: { type: "label", label: "partner" },
      hand: "left",
    },
    {
      beats: 0,
      type: "face",
      direction: { type: "TowardsLabel", label: "next_neighbor" },
    },
    {
      beats: 16,
      type: "balance_and_swing",
      cid: { type: "label", label: "next_neighbor" },
      endFacing: "across",
    },
    {
      beats: 16,
      type: "give_and_take_into_swing",
      cid: { type: "label", label: "partner" },
      drawerRole: "lark",
      endFacing: "across",
    },
    {
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      beats: 4,
      type: "balance_the_ring",
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
  ],
});
