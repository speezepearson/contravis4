import fc from "fast-check";
import { Vector } from "vecti";

import {
  ALL_PROTO_IDS,
  type BasicLabel,
  type DancerId,
  type Hand,
  makeDancerId,
  otherRole,
  parseProtoId,
  type ProgressionDir,
  type ProtoId,
  type Role,
} from "./contraCore";
import { NORTH } from "./geometry";
import { connectHands, type WorldState } from "./worldState";

export const fcProtoId: fc.Arbitrary<ProtoId> = fc.constantFrom<ProtoId>(
  ...ALL_PROTO_IDS,
);

export const fcHand: fc.Arbitrary<Hand> = fc.constantFrom<Hand>(
  "left",
  "right",
);

export const fcDancerId: fc.Arbitrary<DancerId> = fc
  .record({
    dir: fc.constantFrom<ProgressionDir>("up", "down"),
    role: fc.constantFrom<Role>("lark", "robin"),
    offset: fc.integer({ min: -10, max: 10 }),
  })
  .map(({ dir, role, offset }) => makeDancerId({ dir, role, offset }));

// TODO: someday this should also be able to randomly sample a state from an example dance.
export const fcAnyWorldState: fc.Arbitrary<WorldState> = fc
  .record({
    // Random positions for each proto dancer
    positions: fc.record({
      up_lark_0: fcPos(),
      up_robin_0: fcPos(),
      down_lark_0: fcPos(),
      down_robin_0: fcPos(),
    }),
    // 0-4 connectHands attempts
    handConnections: fc.array(
      fc.record({
        id: fcProtoId,
        hand: fcHand,
        theirId: fcDancerId,
        theirHand: fcHand,
      }),
      { minLength: 0, maxLength: 4 },
    ),
    // Neighbor offsets: (up_lark, down_robin) pair and (up_robin, down_lark) pair
    neighborOffset1: fc.integer({ min: -10, max: 10 }),
    neighborOffset2: fc.integer({ min: -10, max: 10 }),
    // Shadow labels: optional offset for each of the shadow types per direction pair
    shadowOffsets: fc.record({
      up: fc.array(
        fc.integer({ min: -10, max: 10 }).filter((o) => o !== 0),
        { minLength: 0, maxLength: 6 },
      ),
      down: fc.array(
        fc.integer({ min: -10, max: 10 }).filter((o) => o !== 0),
        { minLength: 0, maxLength: 6 },
      ),
    }),
    // Extra recents beyond partner+neighbor
    extraRecents: fc.record({
      up_lark_0: fc.array(fcDancerId, { minLength: 0, maxLength: 3 }),
      up_robin_0: fc.array(fcDancerId, { minLength: 0, maxLength: 3 }),
      down_lark_0: fc.array(fcDancerId, { minLength: 0, maxLength: 3 }),
      down_robin_0: fc.array(fcDancerId, { minLength: 0, maxLength: 3 }),
    }),
  })
  .map(
    ({
      positions,
      handConnections,
      neighborOffset1,
      neighborOffset2,
      shadowOffsets,
      extraRecents,
    }) => {
      const SHADOW_LABELS: BasicLabel[] = [
        "shadow",
        "shadow 2",
        "shadow 3",
        "shadow 4",
        "shadow 5",
        "shadow 6",
      ];

      // Build neighbor DancerIds for each proto.
      // Neighbor pairs: (up_lark, down_robin) and (up_robin, down_lark)
      const neighborIds: Record<ProtoId, DancerId> = {
        up_lark_0: makeDancerId({
          dir: "down",
          role: "robin",
          offset: neighborOffset1,
        }),
        down_robin_0: makeDancerId({
          dir: "up",
          role: "lark",
          offset: -neighborOffset1,
        }),
        up_robin_0: makeDancerId({
          dir: "down",
          role: "lark",
          offset: neighborOffset2,
        }),
        down_lark_0: makeDancerId({
          dir: "up",
          role: "robin",
          offset: -neighborOffset2,
        }),
      };

      // Build shadow labels per proto (symmetric within dir pair)
      const shadowLabels: Record<
        ProtoId,
        Partial<Record<BasicLabel, DancerId>>
      > = {
        up_lark_0: {},
        up_robin_0: {},
        down_lark_0: {},
        down_robin_0: {},
      };

      for (const dir of ["up", "down"] as const) {
        const offsets = shadowOffsets[dir];
        const { larkProto, robinProto } = dirProtos(dir);
        for (let i = 0; i < offsets.length && i < SHADOW_LABELS.length; i++) {
          const label = SHADOW_LABELS[i];
          const o = offsets[i];
          // Shadow of lark is robin at offset o, and vice versa at -o
          shadowLabels[larkProto][label] = makeDancerId({
            dir,
            role: "robin",
            offset: o,
          });
          shadowLabels[robinProto][label] = makeDancerId({
            dir,
            role: "lark",
            offset: -o,
          });
        }
      }

      const state: WorldState = {} as WorldState;
      for (const protoId of ALL_PROTO_IDS) {
        const { dir, role } = parseProtoId(protoId);
        const partnerId: DancerId = makeDancerId({
          dir,
          role: otherRole(role),
          offset: 0,
        });

        state[protoId] = {
          protoId,
          pos: positions[protoId],
          facing: NORTH,
          hands: {},
          labels: {
            partner: partnerId,
            neighbor: neighborIds[protoId],
            ...shadowLabels[protoId],
          },
          recents: [partnerId, neighborIds[protoId], ...extraRecents[protoId]],
        };
      }

      // Apply hand connections, ignoring any exceptions
      for (const conn of handConnections) {
        try {
          connectHands(state, conn.id, conn.hand, conn.theirId, conn.theirHand);
        } catch {
          // SWALLOW_EXCEPTION: randomly generated hand connections will often
          // conflict (same proto, hand already occupied, etc.) — that's expected.
        }
      }

      return state;
    },
  );

function fcPos(): fc.Arbitrary<Vector> {
  return fc
    .record({
      x: fc.double({ noNaN: true, min: -4, max: 4 }),
      y: fc.double({ noNaN: true, min: -30, max: 30 }),
    })
    .map(({ x, y }) => new Vector(x, y));
}

function dirProtos(dir: ProgressionDir): {
  larkProto: ProtoId;
  robinProto: ProtoId;
} {
  return {
    larkProto: makeDancerId({ dir, role: "lark", offset: 0 }) as ProtoId,
    robinProto: makeDancerId({ dir, role: "robin", offset: 0 }) as ProtoId,
  };
}
