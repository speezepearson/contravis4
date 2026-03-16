import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "verified",
  name: "Ellie's Iguanarama",
  author: "Isaac Banner",
  initFormation: "becket",
  instructions: [
    {
      beats: 0,
      type: "face",
      direction: {
        type: "TowardsLabel",
        label: "partner",
      },
    },
    {
      beats: 6,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      beats: 2,
      type: "pass_by",
      cid: {
        type: "label",
        label: "neighbor",
      },
      hand: "right",
    },
    {
      beats: 8,
      type: "swing",
      cid: {
        type: "label",
        label: "next_neighbor",
      },
      endFacing: "across",
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
      beats: 0,
      type: "face",
      direction: {
        type: "TowardsLabel",
        label: "next_neighbor",
      },
    },
    {
      beats: 8,
      type: "circle",
      direction: "right",
      nPlaces: 3,
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
          beats: 4,
          type: "long_line_in_center",
          role: "lark",
        },
        {
          beats: 4,
          type: "balance",
          cid: {
            type: "PersonInDirection",
            dir: "on_right",
            onlyRole: "same",
          },
        },
        {
          beats: 0,
          type: "drop_hands",
          which: "right",
        },
        {
          beats: 3,
          type: "allemande",
          cid: {
            type: "label",
            label: "person_in_left_hand",
          },
          handedness: "left",
          rotations: 0.75,
        },
        {
          beats: 0,
          type: "drop_hands",
          which: "both",
        },
      ],
      robins: [],
    },
    {
      beats: 5,
      type: "shoulder_round",
      cid: {
        type: "label",
        label: "partner",
      },
      handedness: "right",
      rotations: 0.85,
    },
    {
      type: "split",
      by: "role",
      larks: [
        {
          beats: 6,
          type: "shoulder_round",
          cid: {
            type: "PersonInDirection",
            dir: "on_left",
            onlyRole: "same",
          },
          handedness: "left",
          rotations: 1,
        },
      ],
      robins: [],
    },
    {
      beats: 10,
      type: "swing",
      cid: {
        type: "label",
        label: "partner",
      },
      endFacing: "across",
    },
    {
      beats: 0,
      type: "greet_new_neighbors",
      cid: {
        type: "PersonInDirection",
        dir: "across",
        onlyRole: "different",
      },
    },
  ],
});
