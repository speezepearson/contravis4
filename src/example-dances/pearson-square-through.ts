import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  name: "Pearson Square Through",
  author: "Ramya Rajan and Spencer Pearson",
  initFormation: "improper",
  status: "verified",
  instructions: [
    {
      id: "e8f44806-9041-472f-89c2-bc93b6e8fdef",
      type: "split",
      by: "role",
      larks: [],
      robins: [
        {
          id: "ffe0d42b-cb43-49fd-9723-00becc2fc606",
          beats: 0,
          type: "face",
          direction: { type: "TowardsLabel", label: "opposite" },
        },
        {
          id: "6ce83aef-cae9-43cc-8b7b-ec2bda049145",
          beats: 0,
          type: "take_hands",
          cid: { type: "label", label: "opposite" },
          hand: "right",
        },
        {
          id: "c34320ec-7097-4f4a-a675-e04f4a24ecaa",
          beats: 3.5,
          type: "balance",
          cid: { type: "label", label: "opposite" },
        },
        {
          id: "bad9433b-1997-45e0-8711-c54533417cd9",
          beats: 2.5,
          type: "pull_by",
          cid: { type: "label", label: "opposite" },
          hand: "right",
        },
        {
          id: "8c6f4e41-c2d6-4d91-a50b-eced93faa11e",
          beats: 0,
          type: "face",
          direction: { type: "PureDirection", dir: "across" },
        },
      ],
    },
    {
      id: "1aa4f018-ab65-4b96-b693-8b0006d70c9f",
      beats: 2,
      type: "pull_by",
      cid: { type: "label", label: "neighbor" },
      hand: "left",
    },
    {
      id: "767fe4e8-3a49-432a-8b44-d555e4fb7178",
      type: "split",
      by: "role",
      larks: [
        {
          id: "47a109a8-f6ff-4cf6-ac1d-dcf50bb4caa5",
          beats: 0,
          type: "face",
          direction: { type: "TowardsLabel", label: "opposite" },
        },
        {
          id: "b743bee3-4eb7-4bc1-a30d-3021a9960391",
          beats: 0,
          type: "take_hands",
          cid: { type: "label", label: "opposite" },
          hand: "right",
        },
        {
          id: "f1319d19-3b7e-43cc-a9c2-5d1929c1a5d0",
          beats: 3.5,
          type: "balance",
          cid: { type: "label", label: "opposite" },
        },
        {
          id: "832058f4-586d-4d87-8cca-3651e25e80cb",
          beats: 2.5,
          type: "pull_by",
          cid: { type: "label", label: "opposite" },
          hand: "right",
        },
        {
          id: "5081bef5-e231-4c3d-804c-9d5dabc93148",
          beats: 0,
          type: "face",
          direction: { type: "TowardsLabel", label: "opposite" },
        },
      ],
      robins: [
        {
          id: "f9cb013a-53ec-4e02-807f-e8b038a5ea8b",
          beats: 0,
          type: "face",
          direction: { type: "PureDirection", dir: "across" },
        },
      ],
    },
    {
      id: "df881289-c4ab-4459-931a-0c8c170e454b",
      beats: 2,
      type: "pull_by",
      cid: { type: "label", label: "partner" },
      hand: "left",
    },
    {
      id: "746ed508-ef62-4ebd-8d69-09f012d3fcd4",
      beats: 0,
      type: "face",
      direction: { type: "TowardsLabel", label: "next_neighbor" },
    },
    {
      id: "64971a30-621e-4f51-bcdd-5263b72e6242",
      beats: 16,
      type: "balance_and_swing",
      cid: { type: "label", label: "next_neighbor" },
      endFacing: "across",
    },
    {
      id: "0bf285eb-d945-4c6b-957f-e3333c6ec6c8",
      beats: 16,
      type: "give_and_take_into_swing",
      cid: { type: "label", label: "partner" },
      drawerRole: "lark",
      endFacing: "across",
    },
    {
      id: "290b5cf8-0908-440c-8687-eb471492cfc9",
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      id: "00283485-c451-4cd1-a6d7-3720b56a234c",
      beats: 4,
      type: "balance_the_ring",
    },
    {
      id: "e5572739-c7e0-401a-aabd-7bdd8f248053",
      beats: 4,
      type: "california_twirl",
    },
    {
      id: "34c54ab2-1bf6-45e6-9441-3ea1dbc04bcd",
      beats: 0,
      type: "greet_new_neighbors",
      cid: {
        type: "PersonInDirection",
        dir: "in_front",
        onlyRole: "different",
      },
    },
  ],
});
