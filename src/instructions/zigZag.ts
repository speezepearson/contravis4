import { z } from "zod";

import {
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
  const matches = resolveMatches("person_across", init, { roles: "different" });

  // Compute facing: dir from leader to follower, rotated 90° to leaderDir side.
  // Both dancers in each pair face the same direction.
  const facingByProto = new Map<ProtoId, typeof init.up_lark_0.facing>();
  for (const id of who) {
    let leader: Dancer, follower: Dancer;
    if (getRole(id) === instr.leader) {
      leader = Dancer.get(id, init);
      follower = matches[id];
    } else {
      follower = Dancer.get(id, init);
      leader = matches[id];
    }
    const leaderPos = leader.pos;
    const followerPos = follower.pos;
    const dirToFollower = getDir({ from: leaderPos, to: followerPos });
    const rotation = instr.leaderDir === "left" ? 90 : -90;
    facingByProto.set(id, dirToFollower.rotateByDegrees(rotation));
  }

  // Inside hands: leaderDir="left" → leader's right, follower's left
  //               leaderDir="right" → leader's left, follower's right
  const leaderInsideHand: Hand = otherHand(instr.leaderDir);
  const followerInsideHand: Hand = instr.leaderDir;

  function makeHandsFn(leaderRole: Role) {
    return (dancer: Dancer) => {
      const match = matches[dancer.protoId];
      if (getRole(dancer.protoId) === leaderRole) {
        return hold([leaderInsideHand, match.id, followerInsideHand]);
      }
      return hold([followerInsideHand, match.id, leaderInsideHand]);
    };
  }

  // Setup: face zigzag direction, take inside hands
  const setupSegment = makeImmediateSegment(init, (id, draft) => {
    const facing = facingByProto.get(id);
    if (facing) draft[id].facing = facing;
    const match = matches[id];
    if (getRole(id) === instr.leader) {
      draft[id].hands = hold([leaderInsideHand, match.id, followerInsideHand]);
    } else {
      draft[id].hands = hold([followerInsideHand, match.id, leaderInsideHand]);
    }
  });

  // leaderDir is from the leader's perspective, but makeHalfPoussetteArcPosition
  // resolves on_${dir} relative to facing-across. Since lark (west) faces east
  // and robin (east) faces west, on_right gives opposite spatial directions.
  // Flip when the leader is on the east side so leaderDir=right consistently
  // means the same spatial direction regardless of which role leads.
  const leaderProto = [...who].find((id) => getRole(id) === instr.leader)!;
  const effectiveDir: Hand =
    must(
      getSide(init[leaderProto].pos),
      `[zig zag] leader ${leaderProto} is too close to the center`,
    ) === "east"
      ? otherHand(instr.leaderDir)
      : instr.leaderDir;

  const segments: Segment[] = [setupSegment];
  let currentState = advanceState([setupSegment], init, who);
  const beatsPerZig = instr.beats / instr.nZigs;

  for (let i = 0; i < instr.nZigs; i++) {
    // Backer alternates each zig for the lateral zig-zag motion.
    // effectiveDir also flips so that on_${dir} resolves to the SAME
    // spatial direction — every zig progresses along the line.
    const currentBacker: Role =
      i % 2 === 0 ? instr.leader : otherRole(instr.leader);
    const currentDir: Hand =
      i % 2 === 0 ? effectiveDir : otherHand(effectiveDir);

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
      hands: makeHandsFn(instr.leader),
      interactedWith: (dancer) => [matches[dancer.protoId].id],
    };

    segments.push(zigSegment);
    currentState = advanceState([zigSegment], currentState, who);
  }

  return segments;
};
