import { z } from "zod";

import {
  type DancerId,
  getRole,
  type Hand,
  HandSchema,
  otherHand,
  otherRole,
  type ProtoId,
  type Role,
  RoleSchema,
} from "../contraCore";
import { getDir } from "../geometry";
import { getDancerState } from "../worldState";
import { instructionBaseSchemaFields, resolveMatches } from "./_base";
import {
  advanceState,
  hold,
  type InstructionAnimator,
  makeImmediateSegment,
  type Segment,
} from "./_segment";
import { makePoussetteArcPosition } from "./poussette";

export const ZigZagInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("zig_zag"),
  leader: RoleSchema,
  leaderDir: HandSchema,
  nZigs: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});
export type ZigZagInstruction = z.infer<typeof ZigZagInstructionSchema>;

export const zigZagSegments: InstructionAnimator<ZigZagInstruction> = (
  instr,
  init,
  who,
) => {
  const matches = resolveMatches("across", init, { roles: "different" });

  // Compute facing: dir from leader to follower, rotated 90° to leaderDir side.
  // Both dancers in each pair face the same direction.
  const facingByProto = new Map<ProtoId, typeof init.up_lark_0.facing>();
  for (const id of who) {
    let leaderId: DancerId, followerId: DancerId;
    if (getRole(id) === instr.leader) {
      leaderId = id;
      followerId = matches[id];
    } else {
      followerId = id;
      leaderId = matches[id];
    }
    const leaderPos = getDancerState(leaderId, init).pos;
    const followerPos = getDancerState(followerId, init).pos;
    const dirToFollower = getDir({ from: leaderPos, to: followerPos });
    const rotation = instr.leaderDir === "left" ? 90 : -90;
    facingByProto.set(id, dirToFollower.rotateByDegrees(rotation));
  }

  // Inside hands: leaderDir="left" → leader's right, follower's left
  //               leaderDir="right" → leader's left, follower's right
  const leaderInsideHand: Hand = otherHand(instr.leaderDir);
  const followerInsideHand: Hand = instr.leaderDir;

  function makeHandsFn(leaderRole: Role) {
    return (id: ProtoId) => {
      const matchId = matches[id];
      if (getRole(id) === leaderRole) {
        return hold([leaderInsideHand, matchId, followerInsideHand]);
      }
      return hold([followerInsideHand, matchId, leaderInsideHand]);
    };
  }

  // Setup: face zigzag direction, take inside hands
  const setupSegment = makeImmediateSegment(init, (id, draft) => {
    const facing = facingByProto.get(id);
    if (facing) draft[id].facing = facing;
    const matchId = matches[id];
    if (getRole(id) === instr.leader) {
      draft[id].hands = hold([leaderInsideHand, matchId, followerInsideHand]);
    } else {
      draft[id].hands = hold([followerInsideHand, matchId, leaderInsideHand]);
    }
  });

  const segments: Segment[] = [setupSegment];
  let currentState = advanceState([setupSegment], init, who);
  const beatsPerZig = instr.beats / instr.nZigs;

  for (let i = 0; i < instr.nZigs; i++) {
    // Backer alternates each zig; backerDir stays constant
    const currentBacker: Role =
      i % 2 === 0 ? instr.leader : otherRole(instr.leader);

    const position = makePoussetteArcPosition(
      currentBacker,
      instr.leaderDir,
      matches,
      currentState,
      who,
    );

    const zigSegment: Segment = {
      dur: beatsPerZig,
      position,
      hands: makeHandsFn(instr.leader),
    };

    segments.push(zigSegment);
    currentState = advanceState([zigSegment], currentState, who);
  }

  return segments;
};
