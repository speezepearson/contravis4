import { describe, expect, it } from "vitest";

import type { DancerId } from "./contraCore";
import {
  getHandsFourAdjacents,
  preferCloser,
  preferOneInFront,
} from "./formations";
import { initFormationStates } from "./instructions";
import { Dancer } from "./worldState";

describe("getHandsFourAdjacents", () => {
  it.each<[DancerId, [DancerId, DancerId]]>([
    ["up_lark_0", ["down_robin_0", "up_robin_0"]],
    ["up_robin_0", ["up_lark_0", "down_lark_0"]],
    ["down_lark_0", ["up_robin_0", "down_robin_0"]],
    ["down_robin_0", ["down_lark_0", "up_lark_0"]],
  ])(
    "improper: preferCloser, preferOneInFront => offset-0 group: %s",
    (d, [dl, dr]) => {
      const init = initFormationStates.improper;
      expect(
        getHandsFourAdjacents(Dancer.get(d, init), {
          by: [preferCloser, preferOneInFront],
        }).map((d) => d.id),
      ).toEqual([dl, dr]);
    },
  );
});
