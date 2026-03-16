import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Petronella",
  initFormation: "improper",
  instructions: [
    {
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      beats: 4,
      type: "balance_the_ring",
    },
    {
      beats: 4,
      type: "petronella",
    },
    {
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      beats: 4,
      type: "balance_the_ring",
    },
    {
      beats: 4,
      type: "petronella",
    },
    {
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      beats: 4,
      type: "balance_the_ring",
    },
    {
      beats: 4,
      type: "petronella",
    },
    {
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      beats: 4,
      type: "balance_the_ring",
    },
    {
      beats: 4,
      type: "petronella",
    },
  ],
});
