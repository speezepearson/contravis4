import fc from "fast-check";
import { Vector } from "vecti";
import z from "zod";

import {
  ALL_PROTO_IDS,
  type DancerId,
  type DancerOffset,
  flipProgDir,
  flipRole,
  type Hand,
  HandSchema,
  makeDancerId,
  type ProgressionDir,
  ProgressionDirSchema,
  type ProtoId,
  type Role,
  RoleSchema,
} from "./contraCore";
import { NORTH } from "./geometry";
import { type Dance, DanceSchema } from "./instructions";
import {
  type SettableLabel,
  SettableLabelSchema,
  ShadowLabelSchema,
} from "./labels";
import { typedParse } from "./utils";
import {
  buildProtoRecord,
  ProtoDancerStateSchema,
  setLabel,
  type WorldState,
} from "./worldState";

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

export const fcSettableLabel: fc.Arbitrary<SettableLabel> = fc.constantFrom(
  ...SettableLabelSchema.options,
);

export const fcDancerOffset: fc.Arbitrary<DancerOffset> = fc.integer({
  min: -10,
  max: 10,
});

export const fcDancerId: fc.Arbitrary<DancerId> = fc
  .record({
    dir: fcProgressionDir,
    role: fcRole,
    offset: fcDancerOffset,
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

export const fcNonzeroOffset = fcDancerOffset.filter((o) => o !== 0);

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
    upLarkNeighbor: fcDancerOffset.map((o) =>
      makeDancerId({ dir: "down", role: "robin", offset: o }),
    ),
    upLarkShadows: fc.array(
      fcNonzeroOffset.map((o) =>
        makeDancerId({ dir: "up", role: "robin", offset: o }),
      ),
      { minLength: 0, maxLength: ShadowLabelSchema.options.length },
    ),
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
      upLarkNeighbor,
      upLarkShadows,
      extraRecents,
    }) => {
      // Build each proto dancer
      const state: WorldState = buildProtoRecord((protoId) => {
        const partner: DancerId = flipRole(protoId);
        return typedParse(ProtoDancerStateSchema, {
          pos: positions[protoId],
          facing: NORTH,
          hands: {},
          labels: {
            partner,
            neighbor: flipProgDir(flipRole(protoId)), // we're about to stomp on this with setLabel()
          },
          recents: [
            partner,
            flipProgDir(flipRole(protoId)),
            ...extraRecents[protoId],
          ],
        });
      });

      // Set 0-4 random hand pointers (one-sided; only the named dancer gets the entry)
      for (const conn of handConnections) {
        state[conn.id].hands[conn.hand] = {
          theirId: conn.theirId,
          theirHand: conn.theirHand,
        };
      }

      setLabel(state, "up_lark_0", "neighbor", upLarkNeighbor);
      for (let i = 0; i < upLarkShadows.length; i++) {
        setLabel(
          state,
          "up_lark_0",
          ShadowLabelSchema.options[i],
          upLarkShadows[i],
        );
      }

      return state;
    },
  );

export async function loadDance(file: string): Promise<Dance> {
  return z.object({ default: DanceSchema }).parse(await import(file)).default;
}
