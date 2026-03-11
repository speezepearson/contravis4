import { z } from "zod";

import {
  getRole,
  type Hand,
  HandSchema,
  otherHand,
  otherRole,
  type ProtoId,
  type Role,
} from "../contraCore";
import { NORTH, SOUTH } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { getSide, must } from "../utils";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields, personInDir } from "./_base";
import {
  advanceState,
  hold,
  type InstructionAnimator,
  makeImmediateSegment,
  type Segment,
} from "./_segment";
import { makeHalfPoussetteArcPositionFn } from "./poussette";

export const ZigZagInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("zig_zag"),
  dir: HandSchema,
  nZigs: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type ZigZagInstruction = z.infer<typeof ZigZagInstructionSchema>;

export const zigZagSegments: InstructionAnimator<ZigZagInstruction> = (
  instr,
  init,
  who,
) => {
  if (who.size !== 4) {
    throw new Error(`[zig zag] expected 4 dancers, got ${who.size}`);
  }

  const orig = (d: Dancer) => d.at(init);
  const getMatch = (d: Dancer) =>
    orig(d).resolveMatch(personInDir("across"), { roles: "different" });

  // Assert all dancers face roughly up or down, and same direction as person across
  for (const id of who) {
    const me = Dancer.get(id, init);
    const facing = me.facing;
    if (Math.abs(facing.y) <= Math.abs(facing.x)) {
      throw new SnazzyError([
        "[zig zag] dancer ",
        { dancerId: id },
        " is not facing roughly up or down",
      ]);
    }
    const match = getMatch(me);
    if (Math.sign(facing.y) !== Math.sign(match.facing.y)) {
      throw new SnazzyError([
        "[zig zag] dancer ",
        { dancerId: id },
        " and ",
        { dancerId: match.id },
        " face different vertical directions",
      ]);
    }
  }

  const isFacingUp = (id: ProtoId) => init[id].facing.y > 0;

  // Determine leader per dancer based on dir and facing:
  //   facing up + dir=left  → leader on west
  //   facing up + dir=right → leader on east
  //   facing down → flipped
  const isLeader = (id: ProtoId): boolean => {
    const up = isFacingUp(id);
    const leaderOnWest = up ? instr.dir === "left" : instr.dir === "right";
    const side = must(getSide(init[id].pos), [
      { dancerId: id },
      "too close to center, not sure which side is east or west",
    ]);
    return leaderOnWest ? side === "west" : side === "east";
  };

  // All leaders must be the same role
  const leaderProto = [...who].find(isLeader)!;
  const leaderRole: Role = getRole(leaderProto);
  for (const id of who) {
    if (isLeader(id) !== (getRole(id) === leaderRole)) {
      throw new Error(`[zig zag] inconsistent leader roles`);
    }
  }

  // Inside hands based on position: west dancer's right, east dancer's left
  const insideHand = (id: ProtoId): Hand => {
    return must(getSide(init[id].pos), [
      { dancerId: id },
      "too close to center, not sure which side is east or west",
    ]) === "west"
      ? "right"
      : "left";
  };

  // Setup: face exactly up or down, take inside hands
  const setupSegment = makeImmediateSegment(init, (id, draft) => {
    draft[id].facing = isFacingUp(id) ? NORTH : SOUTH;
    const match = getMatch(Dancer.get(id, init));
    const myHand = insideHand(id);
    const theirHand = otherHand(myHand);
    draft[id].hands = hold([myHand, match.id, theirHand]);
  });

  const makeHandsFn = () => (dancer: Dancer) => {
    const matchId = getMatch(dancer).id;
    const myHand = insideHand(dancer.protoId);
    const theirHand = otherHand(myHand);
    return hold([myHand, matchId, theirHand]);
  };

  const segments: Segment[] = [setupSegment];
  let currentState = advanceState([setupSegment], init, who);
  const beatsPerZig = instr.beats / instr.nZigs;

  for (let i = 0; i < instr.nZigs; i++) {
    // Backer alternates each zig for lateral zig-zag motion.
    // Dir also alternates so that each zig progresses in the same
    // spatial direction along the line.
    const currentBacker: Role =
      i % 2 === 0 ? leaderRole : otherRole(leaderRole);
    const currentDir: Hand = i % 2 === 0 ? instr.dir : otherHand(instr.dir);

    const position = makeHalfPoussetteArcPositionFn(
      currentBacker,
      currentDir,
      currentState,
    );

    const zigSegment: Segment = {
      dur: beatsPerZig,
      position,
      hands: makeHandsFn(),
      interactedWith: (dancer) => [getMatch(dancer).id],
    };

    segments.push(zigSegment);
    currentState = advanceState([zigSegment], currentState, who);
  }

  return segments;
};
