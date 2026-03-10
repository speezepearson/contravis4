import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Shoulder round",
  initFormation: "improper",
  instructions: [
    {
      id: "606bac0a-9b44-45af-8c6b-8aa6c18dfef8",
      beats: 8,
      type: "shoulder_round",
      cid: { type: "label", label: "neighbor" },
      handedness: "right",
      rotations: 1.25,
    },
    {
      id: "8eb0b31e-602b-419c-b25c-80b51afb8677",
      beats: 8,
      type: "shoulder_round",
      cid: { type: "label", label: "next_neighbor" },
      handedness: "left",
      rotations: 0.75,
    },
    {
      id: "ac6a0153-c764-46a6-80a8-c049f5f9286e",
      beats: 16,
      type: "swing",
      cid: { type: "label", label: "neighbor" },
      endFacing: "across",
    },
  ],
});
