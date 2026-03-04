import { produce } from "immer";
import { describe, expect, it } from "vitest";

import { ALL_PROTO_IDS } from "./contraCore";
import { EAST, NORTH, SOUTH } from "./geometry";
import { inferProgression } from "./inferProgression";
import { initFormationStates } from "./instructions";
import { ContraAnimation } from "./instructions/_base";

describe("inferProgression", () => {
  it("returns 0 if all dancers hold still", () => {
    const init = initFormationStates.improper;
    const animation: ContraAnimation = { dur: 64, getFrame: () => init };
    const progression = inferProgression(animation, init);
    expect(progression).toBe(0);
  });

  it("returns 3 if every dancer moves 3 in their progression direction", () => {
    const init = initFormationStates.improper;
    const animation: ContraAnimation = {
      dur: 64,
      getFrame: (t) => {
        if (t < 32) return init;
        return produce(init, (draft) => {
          draft.up_lark_0.pos = draft.up_lark_0.pos.add(NORTH.multiply(3));
          draft.up_robin_0.pos = draft.up_robin_0.pos.add(NORTH.multiply(3));
          draft.down_lark_0.pos = draft.down_lark_0.pos.add(SOUTH.multiply(3));
          draft.down_robin_0.pos = draft.down_robin_0.pos.add(
            SOUTH.multiply(3),
          );
        });
      },
    };
    const progression = inferProgression(animation, init);
    expect(progression).toBe(3);
  });

  it("returns null if dancers have progressed different distances", () => {
    const init = initFormationStates.improper;
    const animation: ContraAnimation = {
      dur: 64,
      getFrame: (t) => {
        if (t < 32) return init;
        return produce(init, (draft) => {
          draft.up_lark_0.pos = draft.up_lark_0.pos.add(NORTH.multiply(4));
          draft.up_robin_0.pos = draft.up_robin_0.pos.add(NORTH.multiply(3));
          draft.down_lark_0.pos = draft.down_lark_0.pos.add(SOUTH.multiply(3));
          draft.down_robin_0.pos = draft.down_robin_0.pos.add(
            SOUTH.multiply(3),
          );
        });
      },
    };
    const progression = inferProgression(animation, init);
    expect(progression).toBe(null);
  });

  it("returns null if dancers have progressed non-integer distances", () => {
    const init = initFormationStates.improper;
    const animation: ContraAnimation = {
      dur: 64,
      getFrame: (t) => {
        if (t < 32) return init;
        return produce(init, (draft) => {
          draft.up_lark_0.pos = draft.up_lark_0.pos.add(NORTH.multiply(2.2));
          draft.up_robin_0.pos = draft.up_robin_0.pos.add(NORTH.multiply(2.2));
          draft.down_lark_0.pos = draft.down_lark_0.pos.add(
            SOUTH.multiply(2.2),
          );
          draft.down_robin_0.pos = draft.down_robin_0.pos.add(
            SOUTH.multiply(2.2),
          );
        });
      },
    };
    const progression = inferProgression(animation, init);
    expect(progression).toBe(null);
  });

  it("returns null if dancers have progressed integer distances but also moved in x", () => {
    const init = initFormationStates.improper;
    const animation: ContraAnimation = {
      dur: 64,
      getFrame: (t) => {
        if (t < 32) return init;
        return produce(init, (draft) => {
          draft.up_lark_0.pos = draft.up_lark_0.pos.add(
            NORTH.multiply(3).add(EAST.multiply(0.2)),
          );
          draft.up_robin_0.pos = draft.up_robin_0.pos.add(
            NORTH.multiply(3).add(EAST.multiply(0.2)),
          );
          draft.down_lark_0.pos = draft.down_lark_0.pos.add(
            SOUTH.multiply(3).add(EAST.multiply(0.2)),
          );
          draft.down_robin_0.pos = draft.down_robin_0.pos.add(
            SOUTH.multiply(3).add(EAST.multiply(0.2)),
          );
        });
      },
    };
    const progression = inferProgression(animation, init);
    expect(progression).toBe(null);
  });

  it("returns null if dancers have permuted their positions", () => {
    const init = initFormationStates.improper;
    const final = produce(init, (draft) => {
      for (const id of ALL_PROTO_IDS)
        draft[id].pos = draft[id].pos.rotateByRadians(Math.PI / 2);
    });
    const animation: ContraAnimation = {
      dur: 64,
      getFrame: (t) => {
        if (t < 32) return init;
        return final;
      },
    };
    const progression = inferProgression(animation, init);
    expect(progression).toBe(null);
  });
});
