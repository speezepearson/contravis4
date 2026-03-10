import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Box the Gnat",
  initFormation: "improper",
  instructions: [
    {
      id: "d629c391-7b76-4484-afac-7049986f110f",
      beats: 4,
      type: "box_the_gnat",
      cid: { type: "label", label: "neighbor" },
    },
    {
      id: "42801a7a-6666-4073-b29e-659c89ecc1c5",
      beats: 4,
      type: "box_the_gnat",
      cid: { type: "label", label: "neighbor" },
    },
  ],
});
