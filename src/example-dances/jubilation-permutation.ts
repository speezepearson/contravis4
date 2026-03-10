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
      id: "3b5dcab5-fa65-4797-a68f-38a6451c175f",
      beats: 16,
      type: "balance_and_swing",
      cid: "neighbor",
      endFacing: "across",
    },
    {
      id: "359b6cf7-5393-4f77-a968-661c83bc7080",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // A2: gentlespoons allemande left 1½ (8)
    {
      id: "030a4b9c-351a-45ce-999a-90a7d1a06e12",
      type: "split",
      by: "role",
      larks: [
        {
          id: "995e3b0f-ed2e-47e1-bdd3-6a7a5a52ff05",
          beats: 8,
          type: "allemande",
          cid: "opposite",
          handedness: "left",
          rotations: 1.5,
        },
      ],
      robins: [],
    },
    {
      id: "04cbaf91-d4b0-4623-a72c-53c96455d50e",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // A2: partners swing (8)
    {
      id: "108d836b-432d-4419-8f88-aae2c52dc826",
      beats: 8,
      type: "swing",
      cid: "partner",
      endFacing: "across",
    },
    {
      id: "a0c318a9-c6af-458d-96c7-15e55e352477",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // B1: gentlespoons start a half hey - lefts in center, rights on ends (8)
    {
      id: "28b71559-d8b5-4344-9be8-35b4c9c5ab06",
      beats: 8,
      type: "hey",
      full: false,
      centerRole: "lark",
      centerHand: "left",
    },
    // B1: partners swing (8)
    {
      id: "a670f477-cd64-4720-936f-e307c1bfd5ed",
      beats: 8,
      type: "swing",
      cid: "partner",
      endFacing: "across",
    },
    {
      id: "aeea6533-32d3-4718-aaec-8ac9b8983ca0",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // B2: circle left 3 places (6)
    {
      id: "89525916-54df-45b5-8407-5591139e390f",
      beats: 6,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    // B2: pass through (2) ⁋
    {
      id: "b110a8e4-1982-4727-b9eb-89a57a354f01",
      beats: 2,
      type: "pass_by",
      cid: "neighbor",
      hand: "right",
    },
    {
      id: "21c3b2c6-d54d-4e35-800c-3c6665359c5f",
      beats: 0,
      type: "greet_new_neighbors",
      cid: "person_in_front",
    },
    // B2: next neighbors do si do (8)
    {
      id: "6cfb65c2-566b-4fc7-ae15-16533497a245",
      beats: 8,
      type: "do_si_do",
      cid: "neighbor",
      rotations: 1.0,
    },
  ],
});
