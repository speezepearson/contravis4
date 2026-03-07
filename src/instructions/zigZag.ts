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
import { getSide, must } from "../utils";
import { Dancer } from "../worldState";
import { instructionBaseSchemaFields, resolveMatches } from "./_base";
import {
  advanceState,
  hold,
  type InstructionAnimator,
  makeImmediateSegment,
  type Segment,
} from "./_segment";
import { makeHalfPoussetteArcPosition } from "./poussette";

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

  const matches = resolveMatches("person_across", init, { roles: "different" });

  // Assert all dancers face roughly up or down, and same direction as person across
  for (const id of who) {
    const facing = init[id].facing;
    if (Math.abs(facing.y) <= Math.abs(facing.x)) {
      throw new Error(
        `[zig zag] dancer ${id} is not facing roughly up or down`,
      );
    }
    const matchId = matches[id].protoId;
    const matchFacing = init[matchId].facing;
    if (Math.sign(facing.y) !== Math.sign(matchFacing.y)) {
      throw new Error(
        `[zig zag] dancer ${id} and ${matchId} face different vertical directions`,
      );
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
    const side = must(
      getSide(init[id].pos),
      `[zig zag] dancer ${id} is too close to the center`,
    );
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
    return must(
      getSide(init[id].pos),
      `[zig zag] dancer ${id} is too close to the center`,
    ) === "west"
      ? "right"
      : "left";
  };

  // Setup: face exactly up or down, take inside hands
  const setupSegment = makeImmediateSegment(init, (id, draft) => {
    draft[id].facing = isFacingUp(id) ? NORTH : SOUTH;
    const match = matches[id];
    const myHand = insideHand(id);
    const theirHand = otherHand(myHand);
    draft[id].hands = hold([myHand, match.id, theirHand]);
  });

  const makeHandsFn = () => (dancer: Dancer) => {
    const match = matches[dancer.protoId];
    const myHand = insideHand(dancer.protoId);
    const theirHand = otherHand(myHand);
    return hold([myHand, match.id, theirHand]);
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

    const position = makeHalfPoussetteArcPosition(
      currentBacker,
      currentDir,
      matches,
      currentState,
      who,
    );

    const zigSegment: Segment = {
      dur: beatsPerZig,
      position,
      hands: makeHandsFn(),
      interactedWith: (dancer) => [matches[dancer.protoId].id],
    };

    segments.push(zigSegment);
    currentState = advanceState([zigSegment], currentState, who);
  }

  return segments;
};
