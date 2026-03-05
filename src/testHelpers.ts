import fc from "fast-check";
import { Vector } from "vecti";

import {
  ALL_PROTO_IDS,
  type BasicLabel,
  type DancerId,
  type Hand,
  HandSchema,
  makeDancerId,
  otherRole,
  parseProtoId,
  type ProgressionDir,
  ProgressionDirSchema,
  type ProtoId,
  type Role,
  RoleSchema,
  ShadowLabelSchema,
} from "./contraCore";
import { NORTH } from "./geometry";
import { connectHands, Dancer, type WorldState } from "./worldState";

export const fcProtoId: fc.Arbitrary<ProtoId> = fc.constantFrom(
  ...ALL_PROTO_IDS,
);

export const fcHand: fc.Arbitrary<Hand> = fc.constantFrom(
  ...HandSchema.options,
);
export const fcRole: fc.Arbitrary<Role> = fc.constantFrom(
  ...RoleSchema.options,
);
export const fcProgressionDir: fc.Arbitrary<ProgressionDir> = fc.constantFrom(
  ...ProgressionDirSchema.options,
);

export const fcDancerId: fc.Arbitrary<DancerId> = fc
  .record({
    dir: fcProgressionDir,
    role: fcRole,
    offset: fc.integer({ min: -10, max: 10 }),
  })
  .map(({ dir, role, offset }) => makeDancerId({ dir, role, offset }));

// TODO: someday:
// export const fcExampleDanceInterFigureWorldState: fc.Arbitrary<WorldState> = ...pick a random non-dummy dance from `example-dances/` and run some number of its instructions...
// export const fcExampleDanceMidFigureWorldState: fc.Arbitrary<WorldState> = ...pick a random dance from `example-dances/` and getFrame(some random time)...

const fcPos = fc
  .record({
    x: fc.double({ noNaN: true, min: -4, max: 4 }),
    y: fc.double({ noNaN: true, min: -30, max: 30 }),
  })
  .map(({ x, y }) => new Vector(x, y));

const fcNonzeroOffset = fc
  .integer({ min: -10, max: 10 })
  .filter((o) => o !== 0);

/** Random symmetric neighbor labels for a (lark, robin) pair in opposite dirs. */
function fcNeighborPair(
  larkDir: ProgressionDir,
  robinDir: ProgressionDir,
): fc.Arbitrary<[DancerId, DancerId]> {
  return fc
    .integer({ min: -10, max: 10 })
    .map((offset) => [
      makeDancerId({ dir: robinDir, role: "robin", offset }),
      makeDancerId({ dir: larkDir, role: "lark", offset: -offset }),
    ]);
}

/** Random symmetric shadow labels for a (lark, robin) pair in the same dir. */
function fcShadowLabels(
  dir: ProgressionDir,
): fc.Arbitrary<
  [Partial<Record<BasicLabel, DancerId>>, Partial<Record<BasicLabel, DancerId>>]
> {
  return fc
    .array(fcNonzeroOffset, { minLength: 0, maxLength: ShadowLabelSchema.options.length })
    .map((offsets) => {
      const larkShadows: Partial<Record<BasicLabel, DancerId>> = {};
      const robinShadows: Partial<Record<BasicLabel, DancerId>> = {};
      for (let i = 0; i < offsets.length; i++) {
        larkShadows[ShadowLabelSchema.options[i]] = makeDancerId({
          dir,
          role: "robin",
          offset: offsets[i],
        });
        robinShadows[ShadowLabelSchema.options[i]] = makeDancerId({
          dir,
          role: "lark",
          offset: -offsets[i],
        });
      }
      return [larkShadows, robinShadows];
    });
}

export const fcAnyWorldState: fc.Arbitrary<WorldState> = fc
  .record({
    positions: fc.record({
      up_lark_0: fcPos,
      up_robin_0: fcPos,
      down_lark_0: fcPos,
      down_robin_0: fcPos,
    }),
    handConnections: fc.array(
      fc.record({
        id: fcProtoId,
        hand: fcHand,
        theirId: fcDancerId,
        theirHand: fcHand,
      }),
      { minLength: 0, maxLength: 4 },
    ),
    upNeighbors: fcNeighborPair("up", "down"),
    downNeighbors: fcNeighborPair("down", "up"),
    upShadows: fcShadowLabels("up"),
    downShadows: fcShadowLabels("down"),
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
      upNeighbors,
      downNeighbors,
      upShadows,
      downShadows,
      extraRecents,
    }) => {
      const neighbors: Record<ProtoId, DancerId> = {
        up_lark_0: upNeighbors[0],
        down_robin_0: upNeighbors[1],
        up_robin_0: downNeighbors[0],
        down_lark_0: downNeighbors[1],
      };
      const shadows: Record<ProtoId, Partial<Record<BasicLabel, DancerId>>> = {
        up_lark_0: upShadows[0],
        up_robin_0: upShadows[1],
        down_lark_0: downShadows[0],
        down_robin_0: downShadows[1],
      };

      // Build each proto dancer
      const state: WorldState = {} as WorldState;
      for (const protoId of ALL_PROTO_IDS) {
        const { dir, role } = parseProtoId(protoId);
        const partner: DancerId = makeDancerId({
          dir,
          role: otherRole(role),
          offset: 0,
        });
        state[protoId] = new Dancer(protoId, {
          pos: positions[protoId],
          facing: NORTH,
          hands: {},
          labels: {
            partner,
            neighbor: neighbors[protoId],
            ...shadows[protoId],
          },
          recents: [partner, neighbors[protoId], ...extraRecents[protoId]],
        });
      }

      // Connect 0-4 random hands, ignoring conflicts
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
