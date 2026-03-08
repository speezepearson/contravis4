import type { Dance } from "../instructions/index";

export default {
  status: "dummy",
  name: "(dummy) Circle",
  initFormation: "improper",
  instructions: [
    {
      id: "6400a287-e028-4359-8987-085228107d73",
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      id: "05e788af-365e-4536-916a-b6bccda876b7",
      beats: 8,
      type: "circle",
      direction: "right",
      nPlaces: 3,
    },
  ],
} satisfies Dance;
