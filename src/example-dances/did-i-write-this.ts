import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "verified",
  url: "https://contradb.com/dances/2490",
  name: "Did I Write This?",
  author: "Mattie Rynkiewicz",
  initFormation: "improper",
  instructions: [
    {
      beats: 4,
      type: "balance",
      cid: {
        type: "label",
        label: "neighbor",
      },
    },
    {
      beats: 12,
      type: "swing",
      cid: {
        type: "label",
        label: "neighbor",
      },
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
      beats: 8,
      type: "swing",
      cid: {
        type: "label",
        label: "partner",
      },
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
      type: "robins_chain",
      cid: {
        type: "label",
        label: "neighbor",
      },
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
      type: "split",
      by: "direction",
      ups: [
        {
          beats: 0,
          type: "face",
          direction: {
            type: "PureDirection",
            dir: "up",
          },
        },
      ],
      downs: [
        {
          beats: 6,
          type: "swing",
          cid: {
            type: "label",
            label: "partner",
          },
          endFacing: "down",
        },
        {
          beats: 0,
          type: "drop_hands",
          which: "both",
        },
        {
          beats: 2,
          type: "step",
          direction: {
            type: "PureDirection",
            dir: "out",
          },
          distance: 0.25,
          facing: {
            type: "PureDirection",
            dir: "down",
          },
        },
      ],
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
