import { z } from "zod";

import { type DancerId } from "../contraCore";
import { lerpFacing, PI, revolve } from "../geometry";
import { must } from "../utils";
import type { Lark, Robin } from "../worldState";
import { CalledIdentifierSchema, instructionBaseSchemaFields } from "./_base";
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
> = (instr, _init, who) => {
  if (who.size !== 4) throw new Error("chain requires all 4 dancers");

  const getRobinMatch = (dancer: Robin): Robin => {
    const res = must(
      dancer.resolveCalledIdentifier(instr.cid, { roles: "same" }),
      [{ dancerId: dancer.id }, "has no match to chain with"],
    );
    if (!res.isRobin()) throw new Error("programming error");
    return res;
  };
  const getSender = (dancer: Robin) => {
    return must(
      dancer.resolveCalledIdentifier("person_on_left", {
        roles: "different",
      }),
      [
        { dancerId: dancer.id },
        "has no lark on left to be sent out on a chain by",
      ],
    );
  };
  const getSendee = (dancer: Lark): Robin => {
    const across = dancer.resolveCalledDirection("across");
    const res = must(
      dancer.findDancerInDirection(across.rotateByDegrees(-90), {
        roles: "different",
      }),
      [{ dancerId: dancer.id }, "has no robin on right to send on a chain to"],
    );
    if (!res.isRobin()) throw new Error("programming error");
    return res;
  };

  /** The lark who receives this robin after she crosses (= sender of the opposite robin). */
  const getReceiver = (dancer: Robin) => getSender(getRobinMatch(dancer));

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
        return [getSender(dancer).id, getRobinMatch(dancer).id];
      }
      if (dancer.isLark()) return [getSendee(dancer).id];
      throw new Error("programming error");
    },
  };

  // Phase 2: Courtesy turn (robin + receiving lark revolve 180°).
  const courtesyTurn: Segment = {
    dur: halfBeats,
    position: (dancer, frac) => {
      const them = dancer.resolveMatch("person_larks_right_robins_left", {
        roles: "different",
      });
      const center = dancer.pos.add(them.pos).divide(2);
      return revolve(dancer.pos, { around: center, radians: PI * frac });
    },
    facing: rotateFacingBy(() => PI),
    hands: (dancer) => {
      const them = dancer.resolveMatch("person_larks_right_robins_left", {
        roles: "different",
      });
      return hold(["left", them.id, "left"], ["right", them.id, "right"]);
    },
    interactedWith: (dancer): DancerId[] => {
      const them = dancer.resolveMatch("person_larks_right_robins_left", {
        roles: "different",
      });
      return [them.id];
    },
  };

  return [cross, courtesyTurn];
};
