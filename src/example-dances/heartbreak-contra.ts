import type { Dance } from "../instructions/index";

export default {
  status: "verified",
  name: "Heartbreak Contra (A2 ring balance)",
  author: "Dugan Murphy",
  initFormation: "improper",
  instructions: [
    {
      id: "22168e2d-31e2-40fc-a8f3-3b80c276e8aa",
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      id: "79635ec7-38ac-4165-bdbf-390615ebf4df",
      beats: 4,
      type: "balance_the_ring",
    },
    {
      id: "3f735db0-dde1-4af5-be9c-ffcc30478ea1",
      beats: 4,
      type: "petronella",
    },
    {
      id: "85d02dd9-982d-4eb9-ab50-0f1ff50cd362",
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      id: "3b575986-940c-4dfe-97a8-d10b0fe2e0d5",
      beats: 4,
      type: "balance_the_ring",
    },
    {
      id: "fea66ad9-88f5-43c2-9b0d-e135f3e1c404",
      beats: 4,
      type: "petronella",
    },
    {
      id: "d9ac0a9a-c3a1-4917-b19c-2acd00b57ba4",
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      id: "f3ff466d-92cc-4209-a427-a20406c9a6c1",
      beats: 4,
      type: "balance_the_ring",
    },
    {
      id: "72c55d4e-f699-43bc-b434-97d2bad3312d",
      beats: 12,
      type: "swing",
      cid: "neighbor",
      endFacing: "across",
    },
    {
      id: "064605f8-8eb1-4202-9fdf-dfc643b88635",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "d8b663d0-b868-4683-94f9-e973a0d3d44e",
      type: "split",
      by: "role",
      larks: [
        {
          id: "1e291a48-4cd0-4946-aee9-206eeb0b20fe",
          beats: 8,
          type: "allemande",
          cid: "opposite",
          handedness: "left",
          rotations: 1.5,
        },
      ],
      robins: [],
    },
    {
      id: "ca4f103a-05ae-482f-b723-aa1b6530c8b2",
      beats: 8,
      type: "swing",
      cid: "partner",
      endFacing: "across",
    },
    {
      id: "e363e93b-f8f5-4e6f-8586-50b2730bde2e",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "ac6b4c07-12d6-416b-addd-9fb7728c14b0",
      beats: 8,
      type: "circle",
      direction: "left",
      nPlaces: 3,
    },
    {
      id: "7b1c1c25-30cc-4127-8539-f3a7d655d1e2",
      beats: 0,
      type: "drop_hands",
      which: "both",
    },
    {
      id: "69e23c07-fd21-407a-9281-b70b42e19e5f",
      beats: 0,
      type: "take_hands_in_rings",
    },
    {
      id: "880050fc-06b9-4a66-bc17-a17af25ec4c1",
      beats: 4,
      type: "balance_the_ring",
    },
    {
      id: "6439499c-25d0-4cc2-a4c1-c4726c0bc760",
      beats: 4,
      type: "pass_by",
      cid: "neighbor",
      hand: "right",
    },
    {
      id: "b5a1c3d7-9e2f-4a08-b6c4-8d3e5f7a9b01",
      beats: 0,
      type: "greet_new_neighbors",
      cid: "person_in_front",
    },
  ],
} satisfies Dance;
