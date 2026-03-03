import { enableMapSet, produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { makeAnimation } from "./_segment";
import { initFormationStates } from "./index";
import { type SwingInstruction, swingSegments } from "./swing";

const allProtos = new Set<ProtoId>(ALL_PROTO_IDS);

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
      const segments = swingSegments(instr)(init, allProtos);
      const animation = makeAnimation(init, allProtos, segments);

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
