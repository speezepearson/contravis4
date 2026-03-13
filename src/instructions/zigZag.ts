import { produce } from "immer";
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
} from "../contraCore";
import { NORTH, SOUTH } from "../geometry";
import { SnazzyError } from "../snazzyError";
import { getSide, must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type ContraAnimation,
  instructionBaseSchemaFields,
  personInDir,
} from "./_base";
import { animatePlans, type DancerSegment } from "./_plan";
import { makeHalfPoussetteArcDancerPositionFn } from "./poussette";

export const ZigZagInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("zig_zag"),
  dir: HandSchema,
  nZigs: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type ZigZagInstruction = z.infer<typeof ZigZagInstructionSchema>;

// ── Shared validation & pre-computation ─────────────────────────────────

/**
 * Validates zig-zag preconditions and computes the leader role and per-dancer
 * inside hand. These depend on global state (all dancers) so must be done
 * outside the per-dancer plan function.
 */
function validateAndResolve(
  instr: ZigZagInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): {
  leaderRole: Role;
  insideHandMap: Map<ProtoId, Hand>;
  matchIdMap: Map<ProtoId, DancerId>;
} {
  if (who.size !== 4) {
    throw new Error(`[zig zag] expected 4 dancers, got ${who.size}`);
  }

  const orig = (d: Dancer) => d.at(init);
  const getMatch = (d: Dancer) =>
    orig(d).resolveMatch(personInDir("across", "different"));

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
  const leaderProto = must([...who].find(isLeader), [
    "[zig zag] no leader found",
  ]);
  const leaderRole: Role = getRole(leaderProto);
  for (const id of who) {
    if (isLeader(id) !== (getRole(id) === leaderRole)) {
      throw new Error(`[zig zag] inconsistent leader roles`);
    }
  }

  // Inside hands based on position: west dancer's right, east dancer's left
  const insideHandMap = new Map<ProtoId, Hand>();
  const matchIdMap = new Map<ProtoId, DancerId>();
  for (const id of who) {
    const side = must(getSide(init[id].pos), [
      { dancerId: id },
      "too close to center, not sure which side is east or west",
    ]);
    insideHandMap.set(id, side === "west" ? "right" : "left");
    matchIdMap.set(id, getMatch(Dancer.get(id, init)).id);
  }

  return { leaderRole, insideHandMap, matchIdMap };
}

function planZigZag(
  instr: ZigZagInstruction,
  dancer: Dancer,
  leaderRole: Role,
  insideHand: Hand,
  matchId: DancerId,
): DancerSegment[] {
  const isFacingUp = dancer.facing.y > 0;

  // Setup: face exactly up or down, take inside hands
  const setupFacing = isFacingUp ? NORTH : SOUTH;
  const theirHand = otherHand(insideHand);

  const postSetupDancer = produce(dancer, (draft) => {
    draft.facing = setupFacing;
  });

  const setupSegment: DancerSegment = {
    dur: 0,
    position: () => dancer.pos,
    facing: () => setupFacing,
    hands: () => {
      const result: Partial<
        Record<Hand, { theirId: DancerId; theirHand: Hand }>
      > = {};
      result[insideHand] = { theirId: matchId, theirHand: theirHand };
      return result;
    },
  };

  const beatsPerZig = instr.beats / instr.nZigs;
  const segments: DancerSegment[] = [setupSegment];

  let currentDancer = postSetupDancer;

  for (let i = 0; i < instr.nZigs; i++) {
    // Backer alternates each zig for lateral zig-zag motion.
    // Dir also alternates so that each zig progresses in the same
    // spatial direction along the line.
    const currentBacker: Role =
      i % 2 === 0 ? leaderRole : otherRole(leaderRole);
    const currentDir: Hand = i % 2 === 0 ? instr.dir : otherHand(instr.dir);

    const positionFn = makeHalfPoussetteArcDancerPositionFn(
      currentBacker,
      currentDir,
      currentDancer,
    );

    const zigSegment: DancerSegment = {
      dur: beatsPerZig,
      position: positionFn,
      hands: () => {
        const result: Partial<
          Record<Hand, { theirId: DancerId; theirHand: Hand }>
        > = {};
        result[insideHand] = { theirId: matchId, theirHand: theirHand };
        return result;
      },
      interactedWith: () => [matchId],
    };

    segments.push(zigSegment);

    // Advance dancer state for next zig
    if (i < instr.nZigs - 1) {
      currentDancer = produce(currentDancer, (draft) => {
        draft.pos = positionFn(1);
      });
    }
  }

  return segments;
}

export function zigZagAnimator(
  instr: ZigZagInstruction,
  init: WorldState,
  who: ReadonlySet<ProtoId>,
): ContraAnimation {
  const { leaderRole, insideHandMap, matchIdMap } = validateAndResolve(
    instr,
    init,
    who,
  );
  return animatePlans(init, who, (d) =>
    planZigZag(
      instr,
      d,
      leaderRole,
      must(insideHandMap.get(d.protoId), ["missing insideHand for dancer"]),
      must(matchIdMap.get(d.protoId), ["missing matchId for dancer"]),
    ),
  );
}
