import { DanceSchema } from "../instructions/index";
import { typedParse } from "../utils";

export default typedParse(DanceSchema, {
  status: "verified",
  name: "Ellie's Iguanarama",
  author: "Isaac Banner",
  initFormation: "becket",
  instructions: [
    {
      id: "04a38633-9a5a-44b3-bed0-cb879d63a58b",
      beats: 0,
      type: "face",
      direction: {
        type: "TowardsLabel",
        label: "partner",
      },
    },
    {
      id: "765e5f1f-9445-4a38-89e8-6d89ffdd8844",
      beats: 6,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      id: "d26dd868-56cc-4fe2-a0a2-947e6ae1d749",
      beats: 2,
      type: "pass_by",
      cid: {
        type: "label",
        label: "neighbor",
      },
      hand: "right",
    },
    {
      id: "3de83fd2-b291-46ea-9917-5c9c2aedc0ab",
      beats: 8,
      type: "swing",
      cid: {
        type: "label",
        label: "next_neighbor",
      },
      endFacing: "across",
    },
    {
      id: "b2acd7c2-eeaf-4689-bf53-dd69f5ada0ee",
      beats: 8,
      type: "right_left_through",
    },
    {
      id: "c5d8c59a-2c04-4406-a486-2c702f0cc842",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "d81b1a4a-b2dc-49e2-9328-06a5b5f2720e",
      beats: 0,
      type: "face",
      direction: {
        type: "TowardsLabel",
        label: "next_neighbor",
      },
    },
    {
      id: "f328d677-b1c6-4ca5-9433-b09fe8cb9e0f",
      beats: 8,
      type: "circle",
      direction: "right",
      nPlaces: 3,
    },
    {
      id: "107a20eb-7218-44b1-9cfa-ccef5adfad0d",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "ecafa806-f406-43d9-a994-9eca5413c2f4",
      type: "split",
      by: "role",
      larks: [
        {
          id: "44508ea9-f061-44b6-98a0-5b1dc8f56c1a",
          beats: 4,
          type: "long_line_in_center",
          role: "lark",
        },
        {
          id: "06a83f18-4e9c-4f20-bac9-a5fd92f8f9a0",
          beats: 4,
          type: "balance",
          cid: {
            type: "PersonInDirection",
            dir: "on_right",
            onlyRole: "same",
          },
        },
        {
          id: "4377ab1d-8819-4137-96ab-e169c93527d2",
          beats: 0,
          type: "drop_hands",
          which: "right",
        },
        {
          id: "46cc2cfd-9157-4431-af8c-94c0af423850",
          beats: 3,
          type: "allemande",
          cid: {
            type: "label",
            label: "person_in_left_hand",
          },
          handedness: "left",
          rotations: 0.75,
        },
        {
          id: "f53f8d2a-e901-479f-8636-95a1e30a3359",
          beats: 0,
          type: "drop_hands",
          which: "both",
        },
      ],
      robins: [],
    },
    {
      id: "66100c74-755f-4aae-9c24-567d4068994e",
      beats: 5,
      type: "shoulder_round",
      cid: {
        type: "label",
        label: "partner",
      },
      handedness: "right",
      rotations: 0.85,
    },
    {
      id: "07622ea6-bd58-4772-a117-f46ac2908675",
      type: "split",
      by: "role",
      larks: [
        {
          id: "0d2282d3-97de-4b2a-84f5-6fbb96a55529",
          beats: 6,
          type: "shoulder_round",
          cid: {
            type: "PersonInDirection",
            dir: "on_left",
            onlyRole: "same",
          },
          handedness: "left",
          rotations: 1,
        },
      ],
      robins: [],
    },
    {
      id: "16247018-adf7-4a6c-ba43-c8351c63f04c",
      beats: 10,
      type: "swing",
      cid: {
        type: "label",
        label: "partner",
      },
      endFacing: "across",
    },
    {
      id: "a3d8e1f5-6b9c-4207-8a5e-d4c7f2b3e601",
      beats: 0,
      type: "greet_new_neighbors",
      cid: {
        type: "PersonInDirection",
        dir: "across",
        onlyRole: "different",
      },
    },
  ],
});
