import { produce } from "immer";
import { z } from "zod";

import {
  ALL_PROTO_IDS,
  type DancerId,
  getRole,
  type Hand,
  HandSchema,
  otherRole,
  projectDancerIdToProtoId,
  type ProtoId,
  type Role,
  RoleSchema,
} from "../contraCore";
import { ellipsePosition, PI } from "../geometry";
import { getDancerState, type WorldState } from "../worldState";
import {
  type CalledDirection,
  findDancerInCalledDirection,
  instructionBaseSchemaFields,
  resolveCardinalDirection,
  resolveMatches,
} from "./_base";
import {
  advanceState,
  hold,
  type InstructionAnimator,
  makeImmediateSegment,
  type PositionFn,
} from "./_segment";

export const PoussetteInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("poussette"),
  backer: RoleSchema,
  backerDir: HandSchema,
  full: z.boolean(),
});
export type PoussetteInstruction = z.infer<typeof PoussetteInstructionSchema>;

/**
 * Creates a position function for a poussette arc.
 * The backer traces an elliptical arc; the non-backer maintains displacement.
 * Arc dests are resolved by temporarily facing dancers across.
 */
export function makePoussetteArcPosition(
  backerRole: Role,
  backerDir: Hand,
  matches: Record<ProtoId, DancerId>,
  state: WorldState,
  who: ReadonlySet<ProtoId>,
  phi: number = PI,
): PositionFn {
  // Face across internally for arc dest resolution (on_left/on_right depend on facing)
  const facedAcross = produce(state, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      draft[id].facing = resolveCardinalDirection("across", draft[id].pos);
    }
  });

  const backerCid = `on_${backerDir}` as CalledDirection;
  const arcDests = new Map<
    ProtoId,
    { start: typeof state.up_lark_0.pos; end: typeof state.up_lark_0.pos }
  >();
  for (const id of who) {
    if (getRole(id) === backerRole) {
      const found = findDancerInCalledDirection(id, backerCid, facedAcross);
      if (!found) {
        throw new Error(`backer ${id} has no dancer ${backerCid}`);
      }
      arcDests.set(id, {
        start: state[id].pos,
        end: getDancerState(found, facedAcross).pos,
      });
    }
  }

  const nonBackerToBacker = new Map<ProtoId, ProtoId>();
  for (const id of who) {
    if (getRole(id) !== backerRole) {
      nonBackerToBacker.set(id, projectDancerIdToProtoId(matches[id]));
    }
  }

  const getBackerPos = (id: ProtoId, frac: number) => {
    const { start, end } = arcDests.get(id)!;
    return ellipsePosition(start, end, 0.5, phi * frac);
  };

  return (id, frac, segInit) => {
    if (getRole(id) === backerRole) {
      return getBackerPos(id, frac);
    }
    const backerProto = nonBackerToBacker.get(id)!;
    const displacement = segInit[id].pos
      .subtract(segInit[backerProto].pos)
      .multiply(1 - frac * (1 - frac));
    const backerNow = getBackerPos(backerProto, frac);
    return backerNow.add(displacement);
  };
}

export const poussetteSegments: InstructionAnimator<PoussetteInstruction> = (
  instr,
  init,
  who,
) => {
  const matches = resolveMatches("across", init, { roles: "different" });

  const setupSegment = makeImmediateSegment(init, (id, draft) => {
    draft[id].facing = resolveCardinalDirection("across", draft[id].pos);
    const matchId = matches[id];
    draft[id].hands = hold(
      ["left", matchId, "right"],
      ["right", matchId, "left"],
    );
  });

  const afterSetup = advanceState([setupSegment], init, who);

  const handsFn = (id: ProtoId) =>
    hold(["left", matches[id], "right"], ["right", matches[id], "left"]);

  const halfBeats = instr.full ? instr.beats / 2 : instr.beats;

  const firstHalf = {
    dur: halfBeats,
    position: makePoussetteArcPosition(
      instr.backer,
      instr.backerDir,
      matches,
      afterSetup,
      who,
    ),
    hands: handsFn,
  };

  if (!instr.full) {
    return [setupSegment, firstHalf];
  }

  const afterFirst = advanceState([firstHalf], afterSetup, who);
  // The second half uses the other backer but the SAME backerDir.
  // Since the new backer faces the opposite direction across,
  // on_${backerDir} naturally resolves to the opposite spatial direction,
  // bringing the couple back to where it started.
  const secondHalf = {
    dur: halfBeats,
    position: makePoussetteArcPosition(
      otherRole(instr.backer),
      instr.backerDir,
      matches,
      afterFirst,
      who,
    ),
    hands: handsFn,
  };

  return [setupSegment, firstHalf, secondHalf];
};
