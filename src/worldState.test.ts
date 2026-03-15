import fc from "fast-check";
import { produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import {
  ALL_PROTO_IDS,
  DancerIdSchema,
  parseDancerId,
  projectDancerIdToProtoId,
} from "./contraCore";
import { initFormationStates } from "./instructions/index";
import { ShadowLabelSchema } from "./labels";
import {
  fcAnyWorldState,
  fcDancerId,
  fcNonzeroOffset,
  fcProtoId,
  fcSettableLabel,
} from "./testHelpers";
import { must, parses } from "./utils";
import { findNearbyDancers, setLabel, WorldStateSchema } from "./worldState";

describe("WorldStateSchema", () => {
  it("parses JSON.stringify of a WorldState", () => {
    const ws = initFormationStates.improper;
    const json = JSON.parse(JSON.stringify(ws));
    const result = WorldStateSchema.safeParse(json);
    expect(result.error).toBeUndefined();
    if (!result.success) return;
    for (const id of ALL_PROTO_IDS) {
      expect(result.data[id]).toEqual(ws[id]);
      expect(result.data[id].pos.x).toBeCloseTo(ws[id].pos.x);
      expect(result.data[id].pos.y).toBeCloseTo(ws[id].pos.y);
      expect(result.data[id].facing.x).toBeCloseTo(ws[id].facing.x);
      expect(result.data[id].facing.y).toBeCloseTo(ws[id].facing.y);
      expect(result.data[id].labels).toEqual(ws[id].labels);
    }
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
        for (const protoId of ALL_PROTO_IDS) {
          const arr = findNearbyDancers(pos, protoId, state);
          for (let i = 0; i < arr.length - 1; i++) {
            const d1 = arr[i].pos.subtract(pos).length();
            const d2 = arr[i + 1].pos.subtract(pos).length();
            expect(d1).toBeLessThanOrEqual(d2);
          }
        }
      }),
    );
  });

  it("returns arrays where both entries are within 2 y-units of pos", () => {
    fc.assert(
      fc.property(fcAnyWorldState, fcQueryPos, (state, pos) => {
        for (const protoId of ALL_PROTO_IDS) {
          expect(
            Math.abs(findNearbyDancers(pos, protoId, state)[0].pos.y - pos.y),
          ).toBeLessThanOrEqual(2);
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
            DancerIdSchema.parse(`down_robin_${n}`),
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
          setLabel(
            draft,
            "up_lark_0",
            "shadow",
            DancerIdSchema.parse(`up_robin_${n}`),
          );
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
            const p2Label = must(draft[p2].labels[label]);
            setLabel(draft, p2, label, p2Label);
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
