import { z } from "zod";

import { type DancerId, isRobin } from "../contraCore";
import { must } from "../utils";
import type { Lark, Robin } from "../worldState";
import {
  CalledIdentifierSchema,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
} from "./_base";
import { type InstructionAnimator, lerpFacingTo, linearTo } from "./_segment";

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
        "has no left on left to be sent out on a chain by",
      ],
    );
  };
  const getSendee = (dancer: Lark): Robin => {
    const across = dancer.resolveCalledDirection("across");
    const res = must(
      dancer.findDancerInDirection(across.rotateByDegrees(-90), {
        roles: "different",
      }),
      [
        { dancerId: dancer.id },
        "has no right on right to be sent on a chain to",
      ],
    );
    if (!res.isRobin()) throw new Error("programming error");
    return res;
  };
  return [
    {
      dur: instr.beats,
      position: linearTo((dancer) => {
        if (!isRobin(dancer.id)) return dancer.pos;
        const them = dancer.resolveMatch(instr.cid);
        return them.pos;
      }),
      facing: lerpFacingTo((dancer) => {
        if (!isRobin(dancer.id)) {
          return must(resolveCardinalDirection("across", dancer.pos), [
            "cannot resolve across facing for ",
            { dancerId: dancer.id },
          ]);
        }
        const them = dancer.resolveMatch(instr.cid);
        return must(resolveCardinalDirection("across", them.pos), [
          "cannot resolve across facing for ",
          { dancerId: dancer.id },
          " at target position",
        ]);
      }),
      hands: () => ({}),
      interactedWith: (dancer): DancerId[] => {
        if (dancer.isRobin()) {
          return [
            getSender(dancer).id,
            getRobinMatch(dancer).id,
            getSender(getRobinMatch(dancer)).id,
          ];
        } else if (dancer.isLark()) {
          return [getSendee(dancer).id, getRobinMatch(getSendee(dancer)).id];
        } else {
          throw new Error("programming error");
        }
      },
    },
  ];
};
