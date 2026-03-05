import { enableMapSet } from "immer";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { animateSegments } from "./_segment";
import { type CircleInstruction } from "./circle";
// circleSegments doesn't exist yet — this import will fail until implemented
import { circleSegments } from "./circle";
import { initFormationStates } from "./index";

const allProtos = ALL_PROTO_IDS_SET;

function makeInstr(
  overrides: Partial<CircleInstruction> = {},
): CircleInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 8,
    type: "circle",
    direction: "left",
    nPlaces: 4,
    ...overrides,
  };
}

describe("circle", () => {
  it("full rotation returns dancers to starting positions", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 4 });
    const animation = animateSegments(
      init,
      allProtos,
      circleSegments(instr, init, allProtos),
    );
    const final = animation.getFrame(animation.dur);

    for (const id of ALL_PROTO_IDS) {
      expect(final[id].pos.x).toBeCloseTo(init[id].pos.x);
      expect(final[id].pos.y).toBeCloseTo(init[id].pos.y);
    }
  });

  it("direction=left orbits clockwise (quarter turn)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 1 });
    const animation = animateSegments(
      init,
      allProtos,
      circleSegments(instr, init, allProtos),
    );
    const final = animation.getFrame(animation.dur);

    // CW 90° around (0,0): (-0.5,-0.5) → (-0.5, 0.5)
    expect(final.up_lark_0.pos.x).toBeCloseTo(-0.5);
    expect(final.up_lark_0.pos.y).toBeCloseTo(0.5);

    // (0.5,-0.5) → (-0.5,-0.5)
    expect(final.up_robin_0.pos.x).toBeCloseTo(-0.5);
    expect(final.up_robin_0.pos.y).toBeCloseTo(-0.5);
  });

  it("direction=right orbits counter-clockwise (quarter turn)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "right", nPlaces: 1 });
    const animation = animateSegments(
      init,
      allProtos,
      circleSegments(instr, init, allProtos),
    );
    const final = animation.getFrame(animation.dur);

    // CCW 90° around (0,0): (-0.5,-0.5) → (0.5,-0.5)... wait
    // Actually CCW 90°: rotate (-0.5,-0.5) by +90° around (0,0):
    //   x' = x cos90 - y sin90 = 0 - (-0.5)(1) = 0.5
    //   y' = x sin90 + y cos90 = (-0.5)(1) + 0 = -0.5
    expect(final.up_lark_0.pos.x).toBeCloseTo(0.5);
    expect(final.up_lark_0.pos.y).toBeCloseTo(-0.5);
  });

  it("maintains hand connections throughout", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ nPlaces: 2 });
    const animation = animateSegments(
      init,
      allProtos,
      circleSegments(instr, init, allProtos),
    );
    const mid = animation.getFrame(animation.dur / 2);

    for (const id of ALL_PROTO_IDS) {
      expect(mid[id].hands.left, `${id} lost left hand`).toBeDefined();
      expect(mid[id].hands.right, `${id} lost right hand`).toBeDefined();
    }
  });
});
