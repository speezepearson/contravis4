import fc from "fast-check";

import {
  ALL_PROTO_IDS,
  type DancerId,
  makeDancerId,
  type ProgressionDir,
  type ProtoId,
  type Role,
} from "./contraCore";

export const fcProtoId: fc.Arbitrary<ProtoId> = fc.constantFrom<ProtoId>(
  ...ALL_PROTO_IDS,
);

export const fcDancerId: fc.Arbitrary<DancerId> = fc
  .record({
    dir: fc.constantFrom<ProgressionDir>("up", "down"),
    role: fc.constantFrom<Role>("lark", "robin"),
    offset: fc.integer({ min: -10, max: 10 }),
  })
  .map(({ dir, role, offset }) => makeDancerId({ dir, role, offset }));
