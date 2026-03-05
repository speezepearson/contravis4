import fc from "fast-check";
import { produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import {
  ALL_PROTO_IDS,
  getOffset,
  projectDancerIdToProtoId,
  protoIdToDancerId,
} from "./contraCore";
import { initFormationStates } from "./instructions/index";
import { fcAnyWorldState, fcDancerId, fcHand, fcProtoId } from "./testHelpers";
import { connectHands, findNearbyDancers } from "./worldState";

describe("connectHands", () => {
  it("creates bidirectional hand connections with correct offset adjustment", () => {
    fc.assert(
      fc.property(fcProtoId, fcHand, fcDancerId, fcHand, (p1, h1, d2, h2) => {
        fc.pre(projectDancerIdToProtoId(d2) !== p1);

        const state = produce(initFormationStates.improper, (draft) => {
          connectHands(draft, p1, h1, d2, h2);
        });

        expect(state[p1].hands[h1]).toEqual({
          theirId: d2,
          theirHand: h2,
        });

        expect(state[projectDancerIdToProtoId(d2)].hands[h2]).toEqual({
          theirId: protoIdToDancerId(p1, -getOffset(d2)),
          theirHand: h1,
        });
      }),
    );
  });

  it("throws when connecting hands between dancers that share a proto", () => {
    fc.assert(
      fc.property(fcProtoId, fcHand, fcDancerId, fcHand, (p1, h1, d2, h2) => {
        fc.pre(projectDancerIdToProtoId(d2) === p1);
        fc.pre(p1 !== (d2 as string)); // offset !== 0, so they're different dancers

        expect(() => {
          produce(initFormationStates.improper, (draft) => {
            connectHands(draft, p1, h1, d2, h2);
          });
        }).toThrow();
      }),
    );
  });
});

const fcQueryPos = fc
  .record({
    x: fc.double({ noNaN: true, min: -4, max: 4 }),
    y: fc.double({ noNaN: true, min: -30, max: 30 }),
  })
  .map(({ x, y }) => new Vector(x, y));

describe("findNearbyDancers", () => {
  it("returns arrays sorted by distance to pos, closest first", () => {
    fc.assert(
      fc.property(fcAnyWorldState, fcQueryPos, (state, pos) => {
        const result = findNearbyDancers(pos, state);
        for (const protoId of ALL_PROTO_IDS) {
          const arr = result[protoId];
          for (let i = 0; i < arr.length - 1; i++) {
            const d1 = arr[i].pos.subtract(pos).length();
            const d2 = arr[i + 1].pos.subtract(pos).length();
            expect(d1).toBeLessThanOrEqual(d2);
          }
        }
      }),
    );
  });

  it("returns arrays with length between 4 and 10", () => {
    fc.assert(
      fc.property(fcAnyWorldState, fcQueryPos, (state, pos) => {
        const result = findNearbyDancers(pos, state);
        for (const protoId of ALL_PROTO_IDS) {
          expect(result[protoId].length).toBeGreaterThanOrEqual(4);
          expect(result[protoId].length).toBeLessThanOrEqual(10);
        }
      }),
    );
  });

  it("returns arrays where the first entry is within 1 y-unit of pos", () => {
    fc.assert(
      fc.property(fcAnyWorldState, fcQueryPos, (state, pos) => {
        const result = findNearbyDancers(pos, state);
        for (const protoId of ALL_PROTO_IDS) {
          expect(
            Math.abs(result[protoId][0].pos.y - pos.y),
          ).toBeLessThanOrEqual(1);
        }
      }),
    );
  });
});
