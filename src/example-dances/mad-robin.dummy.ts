import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Mad robin",
  initFormation: "improper",
  instructions: [
    {
      id: "e927993b-3243-4c47-820d-be321715a023",
      beats: 8,
      type: "mad_robin",
      cid: { type: "label", label: "neighbor" },
      rotations: 1.5,
      whoInFront: "lark",
    },
    {
      id: "b65c7cdd-f68d-4db4-9186-95a12213bdd3",
      beats: 8,
      type: "mad_robin",
      cid: { type: "label", label: "next_neighbor" },
      rotations: 1.5,
      whoInFront: "robin",
    },
  ],
});
