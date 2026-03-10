import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  initFormation: "improper",
  instructions: [
    {
      id: "8a195fae-3e31-4bac-8fce-f3910937b51d",
      type: "split",
      by: "role",
      larks: [
        {
          id: "f1e8ea71-f5b8-4759-9777-ff41cdfa589c",
          beats: 0,
          type: "face",
          direction: "across",
        },
      ],
      robins: [
        {
          id: "8e72bfc9-b85c-41ce-a542-b2341bc14a0a",
          beats: 0,
          type: "face",
          direction: "out",
        },
      ],
    },
    {
      id: "ea00309f-abf3-4899-bf7e-98a1d8adca02",
      beats: 0,
      type: "form_long_waves",
    },
    {
      id: "ea3677a2-f62b-4ac7-af56-540eba6a3e2e",
      beats: 4,
      type: "box_circulate",
    },
    {
      id: "0e9c04ae-2226-4f09-b8af-56b0fab2e95c",
      beats: 4,
      type: "box_circulate",
    },
    {
      id: "e00c9e74-ac50-45b5-b728-237d98d8dc3c",
      beats: 4,
      type: "box_circulate",
    },
    {
      id: "d25b5f14-4a8b-463a-8b7b-d6fa1ed95785",
      beats: 4,
      type: "box_circulate",
    },
  ],
});
