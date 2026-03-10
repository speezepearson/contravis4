import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "preliminary",
  url: "https://contradb.com/dances/2593",
  name: "Early Evening Rollaway",
  author: "Bob Isaacs",
  initFormation: "improper",
  instructions: [
    // A1: neighbors balance & swing (16)
    {
      id: "35008820-4e47-4d49-ba66-3a13bc814dc7",
      beats: 16,
      type: "balance_and_swing",
      cid: "neighbor",
      endFacing: "across",
    },
    {
      id: "a1d5dc5f-1e13-41ef-a604-932d6f3dbf84",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // A2: right left through (8)
    {
      id: "e12885b7-01d4-4f44-a8a8-9b92ba08d1be",
      beats: 8,
      type: "right_left_through",
    },
    {
      id: "0b374816-32b3-4435-845e-870686829398",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // A2: ladles chain (8)
    {
      id: "4b7bd56e-a5d0-4e8d-a7c9-b125d72dd294",
      beats: 8,
      type: "robins_chain",
      cid: "opposite",
    },
    {
      id: "14a748bb-815f-4e87-b9d1-d123c7014c6f",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // B1: balance the ring (4)
    {
      id: "37728a1f-2366-4ac4-a432-c3c65efa686b",
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      id: "7c8ed0c3-0e7c-4b4b-90b7-f3cd6af47ec9",
      beats: 4,
      type: "balance_the_ring",
    },
    // B1: gentlespoons roll away neighbors with a half sashay across the set (4)
    {
      id: "c522644a-ca1d-4747-a06e-d01b2f26b5ef",
      beats: 4,
      type: "roll_away",
      roller: "lark",
      rollee: "neighbor",
    },
    // B1: partners swing (8)
    {
      id: "add38f54-0ea0-4c79-9f51-984d25d195b2",
      beats: 8,
      type: "swing",
      cid: "partner",
      endFacing: "across",
    },
    {
      id: "7685c08f-dedd-44b8-ab6e-f6a1620de598",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    // B2: circle left 3 places (6)
    {
      id: "d773f603-4f3d-45ab-be60-421124e8add1",
      beats: 6,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    // B2: pass through (2) ⁋
    {
      id: "436e36e3-7e28-47a9-8ce2-2195174fb154",
      beats: 2,
      type: "pass_by",
      cid: "neighbor",
      hand: "right",
    },
    {
      id: "01bcbd2e-dc42-44d2-a2f0-cecedf06bf96",
      beats: 0,
      type: "greet_new_neighbors",
      cid: "person_in_front",
    },
    // B2: next neighbors do si do (8)
    {
      id: "1a198f7c-b8a8-4fa7-8dec-d85ce614a0b5",
      beats: 8,
      type: "do_si_do",
      cid: "neighbor",
      rotations: 1.0,
    },
  ],
});
