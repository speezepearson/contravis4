import { produce } from "immer";
import { z } from "zod";

import { ALL_PROTO_IDS, type Hand, type ProtoId } from "../contraCore";
import { SnazzyError } from "../snazzyError";
import { assertNever, safeThreshold } from "../utils";
import { connectHands, Dancer, type WorldState } from "../worldState";
import {
  CalledIdentifierSchema,
  type ContraAnimation,
  instructionBaseSchemaFields,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { type InstructionAnimator } from "./_segment";

export const TakeHandSchema = z.enum(["left", "right", "inside"]);
export type TakeHand = z.infer<typeof TakeHandSchema>;

/** Determine a dancer's inside hand (the hand closer to the target).
 *  Throws if the target is directly in front of or behind the dancer. */
export function resolveInsideHand(
  dancer: Dancer,
  target: Dancer,
): Hand | undefined {
  const delta = target.pos.subtract(dancer.pos);
  const cross = dancer.facing.x * delta.y - dancer.facing.y * delta.x;
  return safeThreshold(cross, { neg: "right", pos: "left" });
}

export const TakeHandsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("take_hands"),
  beats: z.literal(0),
  cid: CalledIdentifierSchema,
  hand: TakeHandSchema,
});
export type TakeHandsInstruction = z.infer<typeof TakeHandsInstructionSchema>;

function computeTakeHandsFinalState(
  instr: TakeHandsInstruction,
  init: WorldState,
): WorldState {
  return produce(init, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      const other = Dancer.get(id, init).resolveMatch(instr.cid);
      switch (instr.hand) {
        case "left":
          connectHands(draft, id, "left", other.id, "left");
          break;
        case "right":
          connectHands(draft, id, "right", other.id, "right");
          break;
        case "inside": {
          const ourHand = resolveInsideHand(Dancer.get(id, draft), other);
          if (!ourHand)
            throw new SnazzyError([
              { dancerId: id },
              " can't determine inside hand with ",
              { dancerId: other.id },
            ]);
          const theirHand = resolveInsideHand(other, Dancer.get(id, draft));
          if (!theirHand)
            throw new SnazzyError([
              { dancerId: other.id },
              " can't determine inside hand with ",
              { dancerId: id },
            ]);
          connectHands(draft, id, ourHand, other.id, theirHand);
          break;
        }
        default:
          assertNever(instr.hand);
      }
    }
  });
}

export function planTakeHands(
  _instr: TakeHandsInstruction,
  dancer: Dancer,
  finalState: WorldState,
): DancerSegment[] {
  const final = Dancer.get(dancer.protoId, finalState);
  return [
    {
      dur: 0,
      hands: () => final.hands,
    },
  ];
}

export const takeHandsSegments: InstructionAnimator<TakeHandsInstruction> = (
  instr,
  init,
  who,
) => {
  const finalState = computeTakeHandsFinalState(instr, init);
  const anim = animatePlans(init, who, (d) =>
    planTakeHands(instr, d, finalState),
  );
  return [
    {
      dur: 0,
      position: (dancer) => dancer.at(anim.getFrame(0)).pos,
      facing: (dancer) => dancer.at(anim.getFrame(0)).facing,
      hands: (dancer) => dancer.at(anim.getFrame(0)).hands,
      interactedWith: (dancer) => dancer.at(anim.getFrame(0)).recents,
    },
  ];
};

export function takeHandsAnimator(
  instr: TakeHandsInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const finalState = computeTakeHandsFinalState(instr, init);
  return animatePlans(init, who, (dancer) =>
    planTakeHands(instr, dancer, finalState),
  );
}
