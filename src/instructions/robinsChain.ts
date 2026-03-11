import { z } from "zod";

import { type DancerId } from "../contraCore";
import { lerpFacing, PI, revolve } from "../geometry";
import { must } from "../utils";
import { Dancer, getCycle, type Lark, type Robin } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  personInDir,
} from "./_base";
import {
  hold,
  type InstructionAnimator,
  linearTo,
  rotateFacingBy,
  type Segment,
} from "./_segment";

export const RobinsChainInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("robins_chain"),
  cid: CalledIdentifierSchema,
});
export type RobinsChainInstruction = z.infer<
  typeof RobinsChainInstructionSchema
>;

export const robinsChainSegments: InstructionAnimator<
  RobinsChainInstruction
> = (instr, init, who) => {
  if (who.size !== 4) throw new Error("chain requires all 4 dancers");

  /** Robin → receiving lark (given by cid). */
  const getReceiver = (dancer: Robin): Lark => {
    const res = must(
      dancer.resolveCalledIdentifier(instr.cid, { roles: "different" }),
      [{ dancerId: dancer.id }, "has no receiver lark for chain"],
    );
    if (!res.isLark()) throw new Error("programming error");
    return res;
  };

  /** Lark → robin being sent away (setcounterclockwise from lark). */
  const getSendee = (dancer: Lark): Robin => {
    const res = must(
      dancer.resolveCalledIdentifier(personInDir("setcounterclockwise"), {
        roles: "different",
      }),
      [
        { dancerId: dancer.id },
        "has no robin in setcounterclockwise direction to send on a chain",
      ],
    );
    if (!res.isRobin()) throw new Error("programming error");
    return res;
  };

  {
    for (const dancer of who) {
      getCycle(Dancer.get(dancer, init), (d) => {
        if (d.isLark()) return getSendee(d);
        if (d.isRobin()) return getReceiver(d);
        throw new Error("programming error");
      });
    }
  }

  const halfBeats = instr.beats / 2;

  // Phase 1: Robins cross the set; larks shift to the sent robin's position.
  const cross: Segment = {
    dur: halfBeats,
    position: linearTo((dancer) => {
      if (dancer.isRobin()) return getReceiver(dancer).pos;
      if (dancer.isLark()) return getSendee(dancer).pos;
      throw new Error("programming error");
    }),
    facing: (dancer, frac) => {
      if (dancer.isRobin()) {
        return lerpFacing(
          dancer.facing,
          getReceiver(dancer).resolvePureDirection("out"),
          frac,
        );
      }
      if (dancer.isLark()) {
        return lerpFacing(
          dancer.facing,
          dancer.resolvePureDirection("out"),
          frac,
          {
            forceDir: "ccw",
          },
        );
      }
      throw new Error("programming error");
    },
    hands: () => ({}),
    interactedWith: (dancer): DancerId[] => {
      if (dancer.isRobin()) {
        const receiver = getReceiver(dancer);
        return [receiver.id, getSendee(receiver).id];
      }
      if (dancer.isLark()) return [getSendee(dancer).id];
      throw new Error("programming error");
    },
  };

  // Phase 2: Courtesy turn (robin + receiving lark revolve 180°).
  const courtesyTurn: Segment = {
    dur: halfBeats,
    position: (dancer, frac) => {
      const them = dancer.resolveMatch(personInDir("larks_right_robins_left"), {
        roles: "different",
      });
      const center = dancer.pos.add(them.pos).divide(2);
      return revolve(dancer.pos, { around: center, radians: PI * frac });
    },
    facing: rotateFacingBy(() => PI),
    hands: (dancer) => {
      const them = dancer.resolveMatch(personInDir("larks_right_robins_left"), {
        roles: "different",
      });
      return hold(["left", them.id, "left"], ["right", them.id, "right"]);
    },
    interactedWith: (dancer): DancerId[] => {
      const them = dancer.resolveMatch(personInDir("larks_right_robins_left"), {
        roles: "different",
      });
      return [them.id];
    },
  };

  return [cross, courtesyTurn];
};
