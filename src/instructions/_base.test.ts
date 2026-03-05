import fc from "fast-check";
import { produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { circularDistance } from "../utils";
import type { WorldState } from "../worldState";
import { resolveShortLines } from "./_base";
import { initFormationStates } from "./index";

/** Improper with every dancer displaced 0.5m forward and 0.25m to their right. */
const OK_BASE: WorldState = produce(initFormationStates.improper, (draft) => {
  for (const id of ALL_PROTO_IDS) {
    const facing = draft[id].facing;
    const right = new Vector(facing.y, -facing.x);
    draft[id].pos = draft[id].pos
      .add(facing.multiply(0.5))
      .add(right.multiply(0.25));
  }
});

describe("resolveShortLines", () => {
  it("should throw starting in improper", () => {
    expect(() => resolveShortLines(initFormationStates.improper)).toThrow();
  });

  it("should succeed from OK_BASE with a single short line of all proto dancers", () => {
    const res = resolveShortLines(OK_BASE);
    const allProtoSet = new Set<string>(ALL_PROTO_IDS);

    for (const protoId of ALL_PROTO_IDS) {
      const line = res[protoId];
      expect(line).toHaveLength(4);
      expect(new Set<string>(line)).toEqual(allProtoSet);
    }

    // All protos should map to the same tuple (single short line)
    for (const a of ALL_PROTO_IDS) {
      for (const b of ALL_PROTO_IDS) {
        expect(res[a]).toEqual(res[b]);
      }
    }
  });

  it("should succeed when each dancer's y is shifted by an even integer", () => {
    const fcEvenShift = fc.integer({ min: -10, max: 10 }).map((n) => 2 * n);

    fc.assert(
      fc.property(
        fcEvenShift,
        fcEvenShift,
        fcEvenShift,
        fcEvenShift,
        (dy_ul, dy_ur, dy_dl, dy_dr) => {
          const state = produce(OK_BASE, (draft) => {
            draft.up_lark_0.pos = draft.up_lark_0.pos.add(new Vector(0, dy_ul));
            draft.up_robin_0.pos = draft.up_robin_0.pos.add(
              new Vector(0, dy_ur),
            );
            draft.down_lark_0.pos = draft.down_lark_0.pos.add(
              new Vector(0, dy_dl),
            );
            draft.down_robin_0.pos = draft.down_robin_0.pos.add(
              new Vector(0, dy_dr),
            );
          });

          const res = resolveShortLines(state);
          const values = Object.values(res) as string[][];

          for (const arr1 of values) {
            for (const arr2 of values) {
              if (arr1.some((id) => arr2.includes(id))) {
                expect(arr1).toEqual(arr2);
              }
            }
          }
        },
      ),
    );
  });

  it("should throw when a dancer's y is shifted by an odd integer", () => {
    const fcOddShift = fc.integer({ min: -10, max: 10 }).map((n) => 1 + 2 * n);
    const fcProtoId = fc.constantFrom<ProtoId>(...ALL_PROTO_IDS);

    fc.assert(
      fc.property(fcOddShift, fcProtoId, (dy, protoId) => {
        const state = produce(OK_BASE, (draft) => {
          draft[protoId].pos = draft[protoId].pos.add(new Vector(0, dy));
        });

        expect(() => resolveShortLines(state)).toThrow();
      }),
    );
  });

  it("should throw iff max pairwise circularDistance > 0.5", () => {
    const XS: [number, number, number, number] = [0, 0.5, 1, 1.5];
    const fcY = fc.double({ noNaN: true, min: 0, max: 100 });

    fc.assert(
      fc.property(fcY, fcY, fcY, fcY, (y0, y1, y2, y3) => {
        const ys = [y0, y1, y2, y3];
        const state = produce(initFormationStates.improper, (draft) => {
          ALL_PROTO_IDS.forEach((id, i) => {
            draft[id].pos = new Vector(XS[i], ys[i]);
          });
        });

        let maxDist = 0;
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            maxDist = Math.max(maxDist, circularDistance(ys[i], ys[j], 2));
          }
        }

        if (maxDist > 0.5) {
          expect(() => resolveShortLines(state)).toThrow();
        } else {
          expect(() => resolveShortLines(state)).not.toThrow();
        }
      }),
    );
  });
});
