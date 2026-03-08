import type { Dance } from "../instructions/index";

export default {
  status: "dummy",
  name: "(dummy) Mad robin",
  initFormation: "improper",
  instructions: [
    {
      id: "e927993b-3243-4c47-820d-be321715a023",
      beats: 8,
      type: "mad_robin",
      cid: "neighbor",
      rotations: 1.5,
      whoInFront: "lark",
    },
    {
      id: "b65c7cdd-f68d-4db4-9186-95a12213bdd3",
      beats: 8,
      type: "mad_robin",
      cid: "next_neighbor",
      rotations: 1.5,
      whoInFront: "robin",
    },
  ],
} satisfies Dance;
