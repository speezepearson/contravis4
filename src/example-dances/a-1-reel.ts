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
      id: "620aaa66-de90-4e8d-9edb-fad7447c1264",
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      id: "8cafee70-1990-45c7-bd65-805d6558aadd",
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      id: "55509eb9-0918-4b65-980a-7a38d38ae958",
      beats: 4,
      type: "balance_the_ring",
    },
    {
      id: "20843459-fc8f-4ff7-bec9-7272f8aba2b4",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "ec37fb76-beb7-4762-b413-2a34aa5caeb3",
      beats: 4,
      type: "california_twirl",
    },
    {
      id: "0e721062-78c6-48f3-bca7-98d0fc7fa8e7",
      beats: 0,
      type: "greet_new_neighbors",
      cid: "person_in_front",
    },
    {
      id: "ef58bef7-891c-460a-8613-cc9a7d91dd07",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "39829cf2-a20e-4741-9b88-fa6cf6083f1a",
      beats: 16,
      type: "balance_and_swing",
      cid: "neighbor",
      endFacing: "across",
    },
    {
      id: "3ffc0308-fb1a-44aa-a4f5-c4c9b40bffc2",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "1368af1f-bd74-4eff-822c-833b86ffe159",
      beats: 8,
      type: "right_left_through",
    },
    {
      id: "29b634bc-9c49-40ac-8c1c-5cacdb605f06",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "706f1b86-271c-4bc9-ad5c-f35ef05055ba",
      type: "split",
      by: "role",
      larks: [],
      robins: [
        {
          id: "a2c0278c-528a-4582-bd9e-66de5ac6ed6e",
          beats: 8,
          type: "allemande",
          cid: "opposite",
          handedness: "right",
          rotations: 1.5,
        },
      ],
    },
    {
      id: "2138aee0-1d33-4a37-9009-644d6857acb8",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "e61de137-b83d-4a66-98da-e55ca568e6bb",
      beats: 16,
      type: "balance_and_swing",
      cid: "partner",
      endFacing: "across",
    },
  ],
});
