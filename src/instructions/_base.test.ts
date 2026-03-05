import fc from "fast-check";
import { produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
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
    // Apply the same even base shift to ALL dancers (preserving alignment),
    // then add 1 to one dancer, making its total shift 1+2n (odd).
    // The uniform even shift is a no-op for relative positions, so the
    // odd dancer is always exactly 1 unit out of alignment → overlap failure.
    const fcN = fc.integer({ min: -10, max: 10 });
    const fcProtoId = fc.constantFrom<ProtoId>(...ALL_PROTO_IDS);

    fc.assert(
      fc.property(fcN, fcProtoId, (n, protoId) => {
        const state = produce(OK_BASE, (draft) => {
          const evenShift = new Vector(0, 2 * n);
          for (const id of ALL_PROTO_IDS) {
            draft[id].pos = draft[id].pos.add(evenShift);
          }
          draft[protoId].pos = draft[protoId].pos.add(new Vector(0, 1));
        });

        expect(() => resolveShortLines(state)).toThrow();
      }),
    );
  });
});
