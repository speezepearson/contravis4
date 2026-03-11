import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  name: "(dummy) Do-si-do",
  initFormation: "improper",
  instructions: [
    {
      id: "6400a287-e028-4359-8987-085228107d73",
      beats: 8,
      type: "do_si_do",
      cid: { type: "label", label: "neighbor" },
      rotations: 1.5,
    },
    {
      id: "5fa548d6-394b-4b27-b4b2-ebbaba5f0bbf",
      beats: 2,
      type: "pass_by",
      cid: { type: "label", label: "next_neighbor" },
      hand: "left",
    },
  ],
});
