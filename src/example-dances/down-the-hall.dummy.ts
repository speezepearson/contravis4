import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Down the hall",
  initFormation: "improper",
  instructions: [
    {
      id: "74f48041-9e58-4835-9823-b206e9a5f3a8",
      beats: 16,
      type: "swing",
      cid: { type: "label", label: "neighbor" },
      endFacing: "down",
    },
    {
      id: "8242b4ac-4c37-4e6f-9f12-a23207deb638",
      beats: 6,
      type: "down_the_hall",
      distance: 1.5,
    },
    {
      id: "c5bdf276-f00f-471f-b393-b13b2ce38105",
      beats: 2,
      type: "turn_as_a_couple",
    },
    {
      id: "c84e69e2-da09-4572-9e35-a303b64842b4",
      beats: 6,
      type: "up_the_hall",
      distance: 1.5,
    },
    {
      id: "feb48523-520e-4fbe-bd76-a94defdff470",
      beats: 2,
      type: "bend_the_line",
    },
    {
      id: "eb128392-10cd-448e-879e-4659c95d2e00",
      beats: 0,
      type: "face",
      direction: { type: "TowardsLabel", label: "opposite" },
    },
    {
      id: "28a5e2fd-d0fc-4de2-ad63-93ca76a108ae",
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 4,
    },
  ],
});
