import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS, ALL_PROTO_IDS_SET } from "../contraCore";
import { animateSegments } from "./_segment";
import { initFormationStates } from "./index";
import {
  type SingleFilePromenadeInstruction,
  singleFilePromenadeSegments,
} from "./singleFilePromenade";

const allProtos = ALL_PROTO_IDS_SET;

function makeInstr(
  overrides: Partial<SingleFilePromenadeInstruction> = {},
): SingleFilePromenadeInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 8,
    type: "single_file_promenade",
    direction: "left",
    nPlaces: 4,
    ...overrides,
  };
}

describe("singleFilePromenade", () => {
  it("full rotation returns dancers to starting positions", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 4 });
    const animation = animateSegments(
      init,
      allProtos,
      singleFilePromenadeSegments(instr, init, allProtos),
    );
    const final = animation.getFrame(animation.dur);

    for (const id of ALL_PROTO_IDS) {
      expect(final[id].pos.x).toBeCloseTo(init[id].pos.x);
      expect(final[id].pos.y).toBeCloseTo(init[id].pos.y);
    }
  });

  it("direction=right orbits clockwise (quarter turn)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "right", nPlaces: 1 });
    const animation = animateSegments(
      init,
      allProtos,
      singleFilePromenadeSegments(instr, init, allProtos),
    );
    const final = animation.getFrame(animation.dur);

    expect(final.up_lark_0.pos.x).toBeCloseTo(-0.5);
    expect(final.up_lark_0.pos.y).toBeCloseTo(0.5);

    expect(final.up_robin_0.pos.x).toBeCloseTo(-0.5);
    expect(final.up_robin_0.pos.y).toBeCloseTo(-0.5);
  });

  it("direction=left orbits counter-clockwise (quarter turn)", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 1 });
    const animation = animateSegments(
      init,
      allProtos,
      singleFilePromenadeSegments(instr, init, allProtos),
    );
    const final = animation.getFrame(animation.dur);

    expect(final.up_lark_0.pos.x).toBeCloseTo(0.5);
    expect(final.up_lark_0.pos.y).toBeCloseTo(-0.5);
  });

  it("facing is rotated 90° from circle facing", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 1 });
    const animation = animateSegments(
      init,
      allProtos,
      singleFilePromenadeSegments(instr, init, allProtos),
    );
    const mid = animation.getFrame(animation.dur / 2);

    for (const id of ALL_PROTO_IDS) {
      const toCenter = mid[id].pos.multiply(-1).normalize();
      const dot = mid[id].facing.x * toCenter.x + mid[id].facing.y * toCenter.y;
      expect(Math.abs(dot)).toBeLessThan(0.5);
    }
  });

  it("no hands are connected at any point", () => {
    const init = initFormationStates.improper;
    const instr = makeInstr({ direction: "left", nPlaces: 2 });
    const animation = animateSegments(
      init,
      allProtos,
      singleFilePromenadeSegments(instr, init, allProtos),
    );
    const mid = animation.getFrame(animation.dur / 2);

    for (const id of ALL_PROTO_IDS) {
      expect(
        mid[id].hands.left,
        `${id} should not have left hand`,
      ).toBeUndefined();
      expect(
        mid[id].hands.right,
        `${id} should not have right hand`,
      ).toBeUndefined();
    }
  });
});
