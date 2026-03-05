import { enableMapSet, produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS_SET } from "../contraCore";
import type { WorldState } from "../worldState";
import { animateSegments } from "./_segment";
import { initFormationStates } from "./index";
import { type SwingInstruction, swingSegments } from "./swing";

const allProtos = ALL_PROTO_IDS_SET;

function makeInstr(
  overrides: Partial<SwingInstruction> = {},
): SwingInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 16,
    type: "swing",
    cid: "partner",
    endFacing: "up",
    ...overrides,
  };
}

function swingFinalState(
  init: WorldState,
  overrides: Partial<SwingInstruction> = {},
) {
  const instr = makeInstr(overrides);
  const segments = swingSegments(instr, init, allProtos);
  const animation = animateSegments(init, allProtos, segments);
  return animation.getFrame(animation.dur);
}

function initWithPartnerDistance(distance: number) {
  return produce(initFormationStates.improper, (draft) => {
    draft.up_lark_0.pos = new Vector(-distance / 2, -0.5);
    draft.up_robin_0.pos = new Vector(distance / 2, -0.5);
    draft.down_lark_0.pos = new Vector(distance / 2, 0.5);
    draft.down_robin_0.pos = new Vector(-distance / 2, 0.5);
  });
}

describe("swing approach/orbit speed matching", () => {
  const dt = 0.1;

  for (const distance of [0.25, 0.5, 1.0, 1.5]) {
    it(`velocity is smooth at approach→swing boundary (distance=${distance}m)`, () => {
      const init = initWithPartnerDistance(distance);
      const instr = makeInstr();
      const segments = swingSegments(instr, init, allProtos);
      const animation = animateSegments(init, allProtos, segments);

      const approachEnd = segments[0].dur;
      const before = animation.getFrame(approachEnd - dt);
      const at = animation.getFrame(approachEnd);
      const after = animation.getFrame(approachEnd + dt);

      for (const id of allProtos) {
        const speedBefore = at[id].pos.subtract(before[id].pos).length() / dt;
        const speedAfter = after[id].pos.subtract(at[id].pos).length() / dt;

        const ratio =
          Math.max(speedBefore, speedAfter) / Math.min(speedBefore, speedAfter);
        expect(
          ratio,
          `dancer ${id} at distance ${distance}: speeds ${speedBefore.toFixed(3)} vs ${speedAfter.toFixed(3)}`,
        ).toBeLessThan(1.5);
      }
    });
  }
});

describe("swing endFacing=across snaps to half-integer grid", () => {
  for (const { label, init } of [
    {
      label: "off-grid partner centers",
      init: produce(initFormationStates.improper, (draft) => {
        // Pair up_lark_0 + up_robin_0 → center (-0.3, -0.3)
        draft.up_lark_0.pos = new Vector(-0.7, -0.3);
        draft.up_robin_0.pos = new Vector(0.1, -0.3);
        // Pair down_lark_0 + down_robin_0 → center (0.3, 0.3)
        draft.down_lark_0.pos = new Vector(0.7, 0.3);
        draft.down_robin_0.pos = new Vector(-0.1, 0.3);
      }),
    },
    {
      label: "neighbor swing from improper",
      init: initFormationStates.improper,
    },
  ]) {
    it(`every dancer ends at x=±0.5 and y=multiple of 0.5 (${label})`, () => {
      const cid = label.includes("neighbor") ? "neighbor" : "partner";
      const final = swingFinalState(init, { endFacing: "across", cid });

      for (const id of allProtos) {
        const { pos } = final[id];
        expect(
          Math.abs(pos.x),
          `${id}: expected |x|=0.5 but got x=${pos.x}`,
        ).toBeCloseTo(0.5, 5);
        expect(
          pos.y - 0.5,
          `${id}: expected y to be [integer]+0.5 but got y=${pos.y}`,
        ).toBeCloseTo(Math.round(pos.y - 0.5), 5);
      }
    });
  }
});
