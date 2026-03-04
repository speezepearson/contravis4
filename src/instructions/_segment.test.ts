import { enableMapSet } from "immer";
import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

enableMapSet();

import { ALL_PROTO_IDS, type ProtoId } from "../contraCore";
import { NORTH } from "../geometry";
import { animateSegments, type Segment } from "./_segment";
import { initFormationStates } from "./index";

const allProtos = new Set<ProtoId>(ALL_PROTO_IDS);

describe("makeAnimation", () => {
  const init = initFormationStates.improper;

  it("renders a trailing zero-duration segment", () => {
    const marker = new Vector(99, 99);
    const segments: Segment[] = [
      {
        dur: 4,
        position: (id, frac, segInit) =>
          segInit[id].pos.add(new Vector(frac, 0)),
      },
      {
        dur: 0,
        position: () => marker,
        facing: () => NORTH,
      },
    ];

    const anim = animateSegments(init, allProtos, segments);
    expect(anim.dur).toBe(4);

    // At t=dur, the trailing zero-dur segment should be active
    const final = anim.getFrame(4);
    expect(final.up_lark_0.pos.x).toBe(99);
    expect(final.up_lark_0.pos.y).toBe(99);
  });

  it("renders mid-animation zero-duration segments correctly", () => {
    const segments: Segment[] = [
      { dur: 2 },
      {
        dur: 0,
        facing: () => new Vector(1, 0), // face EAST
      },
      {
        dur: 2,
      },
    ];

    const anim = animateSegments(init, allProtos, segments);
    expect(anim.dur).toBe(4);

    // At t=2, the zero-dur segment should have applied — segment 2's
    // segInit has the facing change baked in, and at frac=0 it preserves it.
    const mid = anim.getFrame(2);
    expect(mid.up_lark_0.facing.x).toBeCloseTo(1);
    expect(mid.up_lark_0.facing.y).toBeCloseTo(0);
  });
});
