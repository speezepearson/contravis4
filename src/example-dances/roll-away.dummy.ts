import type { Dance } from "../instructions/index";

export default {
  status: "dummy",
  name: "(dummy) Roll away",
  initFormation: "improper",
  instructions: [
    {
      id: "921f56ff-b181-49f1-b445-8be1996c6a9d",
      beats: 2,
      type: "roll_away",
      roller: "lark",
      rollee: "partner",
    },
    {
      id: "70e089f1-dacc-483b-9183-e24042dd9562",
      beats: 2,
      type: "roll_away",
      roller: "robin",
      rollee: "partner",
    },
  ],
} satisfies Dance;
