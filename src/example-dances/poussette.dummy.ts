import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "dummy",
  initFormation: "improper",
  instructions: [
    {
      beats: 8,
      type: "poussette",
      backer: "lark",
      backerDir: "left",
      full: true,
    },
    {
      beats: 8,
      type: "poussette",
      backer: "lark",
      backerDir: "left",
      full: false,
    },
    {
      beats: 8,
      type: "poussette",
      backer: "robin",
      backerDir: "left",
      full: false,
    },
  ],
});
