import fc from "fast-check";
import { produce } from "immer";
import { describe, expect, it } from "vitest";

import {
  getOffset,
  type Hand,
  projectDancerIdToProtoId,
  protoIdToDancerId,
} from "./contraCore";
import { initFormationStates } from "./instructions/index";
import { fcDancerId, fcProtoId } from "./testHelpers";
import { connectHands } from "./worldState";

const fcHand: fc.Arbitrary<Hand> = fc.constantFrom<Hand>("left", "right");

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
