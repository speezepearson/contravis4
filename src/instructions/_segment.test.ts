import { Vector } from "vecti";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS_SET } from "../contraCore";
import { NORTH } from "../geometry";
import { animateSegments, type Segment } from "./_segment";
import { initFormationStates } from "./index";

const allProtos = ALL_PROTO_IDS_SET;

describe.skip("velocity sanity check", () => {
  const init = initFormationStates.improper;

  it("throws when a dancer moves faster than 1 unit/beat", () => {
    const segments: Segment[] = [
      {
        dur: 2,
        // Move 3 units in 2 beats = 1.5 units/beat
        position: (dancer, frac) => dancer.pos.add(new Vector(3 * frac, 0)),
      },
    ];

    expect(() => animateSegments(init, allProtos, segments)).toThrow(
      /moving too fast/,
    );
  });

  it("does not throw when dancers move at reasonable speed", () => {
    const segments: Segment[] = [
      {
        dur: 4,
        // Move 1 unit in 4 beats = 0.25 units/beat
        position: (dancer, frac) => dancer.pos.add(new Vector(frac, 0)),
      },
    ];

    expect(() => animateSegments(init, allProtos, segments)).not.toThrow();
  });

  it("skips zero-duration segments", () => {
    const segments: Segment[] = [
      {
        dur: 0,
        // Teleport — should not trigger velocity check
        position: () => new Vector(5, 5),
      },
    ];

    expect(() => animateSegments(init, allProtos, segments)).not.toThrow();
  });
});

describe.skip("makeAnimation", () => {
  const init = initFormationStates.improper;

  it("renders a trailing zero-duration segment", () => {
    // Use positions close to where dancers end up, to avoid triggering
    // the velocity sanity check at the teleport boundary.
    const segments: Segment[] = [
      {
        dur: 4,
        position: (dancer, frac) => dancer.pos.add(new Vector(0.1 * frac, 0)),
      },
      {
        dur: 0,
        position: (dancer) => dancer.pos.add(new Vector(0.01, 0)),
        facing: () => NORTH,
      },
    ];

    const anim = animateSegments(init, allProtos, segments);
    expect(anim.dur).toBe(4);

    // At t=dur, the trailing zero-dur segment should be active.
    // up_lark_0 starts at (-0.5, 0.5), moves +0.1 in first seg, then +0.01 in zero-dur.
    const final = anim.getFrame(4);
    const startPos = init.up_lark_0.pos;
    expect(final.up_lark_0.pos.x).toBeCloseTo(startPos.x + 0.1 + 0.01);
    expect(final.up_lark_0.pos.y).toBeCloseTo(startPos.y);
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
