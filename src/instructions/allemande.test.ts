import { enableMapSet, produce } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { type AllemandeInstruction, allemandeSegments } from "./allemande";
import { initFormationStates } from "./index";
import { animateSegments } from "./_segment";

const allProtos = new Set<ProtoId>(ALL_PROTO_IDS);

function makeInstr(
  overrides: Partial<AllemandeInstruction> = {},
): AllemandeInstruction {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    beats: 8,
    type: "allemande",
    cid: "neighbor",
    handedness: "left",
    rotations: 1.5,
    ...overrides,
  };
}

function initWithNeighborDistance(distance: number) {
  return produce(initFormationStates.improper, (draft) => {
    draft.up_lark_0.pos = new Vector(-0.5, -distance / 2);
    draft.down_robin_0.pos = new Vector(-0.5, distance / 2);
    draft.up_robin_0.pos = new Vector(0.5, -distance / 2);
    draft.down_lark_0.pos = new Vector(0.5, distance / 2);
  });
}

describe("allemande approach/orbit speed matching", () => {
  const dt = 0.1;

  for (const distance of [0.25, 0.5, 1.0, 1.5]) {
    it(`velocity is smooth at approach→orbit boundary (distance=${distance}m)`, () => {
      const init = initWithNeighborDistance(distance);
      const instr = makeInstr();
      const segments = allemandeSegments(instr, init, allProtos);
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
