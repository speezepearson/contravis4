import type { Dance } from "../instructions/index";

export default {
  status: "dummy",
  name: "(dummy) Rory O'More",
  initFormation: "improper",
  instructions: [
    {
      id: "65210aba-5a3e-4325-be24-e6af5d647929",
      beats: 4,
      type: "allemande",
      cid: "neighbor",
      handedness: "right",
      rotations: 0.75,
    },
    {
      id: "de57a3f9-a790-4dab-ac87-d0dfbd8537dd",
      beats: 0,
      type: "form_short_waves",
    },
    {
      id: "03d2342c-ca32-43a6-9747-2d1722402039",
      beats: 4,
      type: "balance",
      cid: "neighbor",
    },
    {
      id: "9596411b-aacd-4774-a592-f02e4f1c817d",
      beats: 4,
      type: "rory_o_more",
      direction: "right",
    },
    {
      id: "9fd1e266-43c1-4e19-a52c-61159286962a",
      beats: 0,
      type: "form_short_waves",
    },
    {
      id: "8440ff60-26f3-4811-8187-47a32b37d956",
      beats: 4,
      type: "balance",
      cid: "neighbor",
    },
    {
      id: "3ce813f8-d0bd-4e37-a06b-a33587c146b5",
      beats: 4,
      type: "rory_o_more",
      direction: "left",
    },
    {
      id: "2dd1e3df-fe76-4fa0-b283-cd7aa03e999d",
      beats: 8,
      type: "allemande",
      cid: "neighbor",
      handedness: "right",
      rotations: 1.25,
    },
    {
      id: "74e041a9-6b21-414b-be62-4ed6ad985e32",
      beats: 2,
      type: "pull_by",
      cid: "neighbor",
      hand: "right",
    },
    {
      id: "36b620a5-4120-446f-a5d8-64b72c4826eb",
      beats: 1,
      type: "step",
      direction: "in_front",
      distance: 0.25,
      facing: "in_front",
    },
  ],
} satisfies Dance;
