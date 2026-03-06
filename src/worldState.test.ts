import fc from "fast-check";
import { produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import {
  ALL_PROTO_IDS,
  type DancerId,
  getOffset,
  parseDancerId,
  projectDancerIdToProtoId,
  protoIdToDancerId,
} from "./contraCore";
import { initFormationStates } from "./instructions/index";
import { ShadowLabelSchema } from "./labels";
import {
  fcAnyWorldState,
  fcDancerId,
  fcHand,
  fcNonzeroOffset,
  fcProtoId,
  fcSettableLabel,
} from "./testHelpers";
import { parses } from "./utils";
import {
  connectHands,
  findNearbyDancers,
  setLabel,
  WorldStateSchema,
} from "./worldState";

describe("WorldStateSchema", () => {
  it("parses JSON.stringify of a WorldState", () => {
    const ws = initFormationStates.improper;
    const json = JSON.parse(JSON.stringify(ws));
    const result = WorldStateSchema.safeParse(json);
    expect(result.success).toBe(true);
    if (!result.success) return;
    for (const id of ALL_PROTO_IDS) {
      expect(result.data[id].id).toBe(ws[id].id);
      expect(result.data[id].pos.x).toBeCloseTo(ws[id].pos.x);
      expect(result.data[id].pos.y).toBeCloseTo(ws[id].pos.y);
      expect(result.data[id].facing.x).toBeCloseTo(ws[id].facing.x);
      expect(result.data[id].facing.y).toBeCloseTo(ws[id].facing.y);
      expect(result.data[id].labels).toEqual(ws[id].labels);
    }
  });
});

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

describe("setLabel", () => {
  it("throws when dancerId's proto is protoId", () => {
    const state = initFormationStates.improper;
    expect(() => setLabel(state, "up_lark_0", "neighbor", "up_lark_5")).toThrow(
      "same proto",
    );
  });

  it("throws when dancerId has the same role as protoId", () => {
    const state = initFormationStates.improper;
    expect(() =>
      setLabel(state, "up_lark_0", "neighbor", "down_lark_5"),
    ).toThrow("same role");
  });

  it("throws when setting other-dir label to same-dir dancer", () => {
    const state = initFormationStates.improper;
    expect(() =>
      setLabel(state, "up_lark_0", "neighbor", "up_robin_5"),
    ).toThrow();
  });

  it("throws when setting same-dir label to other-dir dancer", () => {
    const state = initFormationStates.improper;
    expect(() =>
      setLabel(state, "up_lark_0", "shadow", "down_robin_5"),
    ).toThrow();
  });

  it("throws when setting shadow to partner", () => {
    const state = initFormationStates.improper;
    expect(() => setLabel(state, "up_lark_0", "shadow", "up_robin_0")).toThrow(
      "partner",
    );
  });

  // These fc tests are red until setLabel is implemented (currently throws "not implemented")
  it("updates all neighbor labels consistently", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10, max: 10 }), (n) => {
        const state = produce(initFormationStates.improper, (draft) => {
          setLabel(
            draft,
            "up_lark_0",
            "neighbor",
            `down_robin_${n}` as DancerId,
          );
        });
        expect(state.up_lark_0.labels.neighbor, "up_lark_0").toBe(
          `down_robin_${n}`,
        );
        expect(state.down_robin_0.labels.neighbor, "down_robin_0").toBe(
          `up_lark_${-n}`,
        );
        expect(state.down_lark_0.labels.neighbor, "down_lark_0").toBe(
          `up_robin_${-n}`,
        );
        expect(state.up_robin_0.labels.neighbor, "up_robin_0").toBe(
          `down_lark_${n}`,
        );
      }),
    );
  });

  it("updates all shadow labels consistently", () => {
    fc.assert(
      fc.property(fcNonzeroOffset, (n) => {
        const state = produce(initFormationStates.improper, (draft) => {
          setLabel(draft, "up_lark_0", "shadow", `up_robin_${n}` as DancerId);
        });
        expect(state.up_lark_0.labels.shadow, "up_lark_0").toBe(
          `up_robin_${n}`,
        );
        expect(state.up_robin_0.labels.shadow, "up_robin_0").toBe(
          `up_lark_${-n}`,
        );
        expect(state.down_lark_0.labels.shadow, "down_lark_0").toBe(
          `down_robin_${-n}`,
        );
        expect(state.down_robin_0.labels.shadow, "down_robin_0").toBe(
          `down_lark_${n}`,
        );
      }),
    );
  });

  it("setLabel is a noop when re-applied with the value it already set", () => {
    fc.assert(
      fc.property(
        fcProtoId,
        fcSettableLabel,
        fcDancerId,
        fcProtoId,
        (p1, label, target, p2) => {
          // Filter to inputs that pass validation
          const { dir: p1Dir, role: p1Role } = parseDancerId(p1);
          const { dir: tDir, role: tRole } = parseDancerId(target);
          fc.pre(projectDancerIdToProtoId(target) !== p1);
          fc.pre(tRole !== p1Role);
          const isOtherDir = label === "neighbor";
          fc.pre(isOtherDir ? p1Dir !== tDir : p1Dir === tDir);
          fc.pre(
            !parses(ShadowLabelSchema, label) ||
              initFormationStates.improper[p1].labels.partner !== target,
          );

          const state = produce(initFormationStates.improper, (draft) => {
            setLabel(draft, p1, label, target);
            const p2Label =
              draft[p2].labels[
                label as keyof (typeof draft)[typeof p2]["labels"]
              ];
            setLabel(draft, p2, label, p2Label as DancerId);
          });

          const state2 = produce(initFormationStates.improper, (draft) => {
            setLabel(draft, p1, label, target);
          });

          for (const id of ALL_PROTO_IDS) {
            expect(state[id].labels).toEqual(state2[id].labels);
          }
        },
      ),
    );
  });
});
