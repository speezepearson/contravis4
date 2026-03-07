import { produce } from "immer";
import { z } from "zod";

import {
  ALL_PROTO_IDS,
  getRole,
  type Hand,
  HandSchema,
  otherRole,
  type ProtoId,
  type Role,
  RoleSchema,
} from "../contraCore";
import { ellipsePosition, PI } from "../geometry";
import { must } from "../utils";
import { Dancer, type WorldState } from "../worldState";
import {
  type CalledDirection,
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
  type Segment,
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
export function makeHalfPoussetteArcPosition(
  backerRole: Role,
  backerDir: Hand,
  matches: Record<ProtoId, Dancer>,
  state: WorldState,
  who: ReadonlySet<ProtoId>,
): PositionFn {
  // Face across internally for arc dest resolution (on_left/on_right depend on facing)
  const facedAcross = produce(state, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      draft[id].facing = must(
        resolveCardinalDirection("across", draft[id].pos),
        `[poussette] dancer ${id} is too close to the center`,
      );
    }
  });

  const backerCid = `on_${backerDir}` as CalledDirection;
  const arcDests = new Map<
    ProtoId,
    { start: typeof state.up_lark_0.pos; end: typeof state.up_lark_0.pos }
  >();
  for (const id of who) {
    if (getRole(id) === backerRole) {
      const found = Dancer.get(id, facedAcross).findDancerInCalledDirection(
        backerCid,
      );
      if (!found) {
        throw new Error(`backer ${id} has no dancer ${backerCid}`);
      }
      arcDests.set(id, {
        start: state[id].pos,
        end: found.pos,
      });
    }
  }

  const nonBackerToBacker = new Map<ProtoId, ProtoId>();
  for (const id of who) {
    if (getRole(id) !== backerRole) {
      nonBackerToBacker.set(id, matches[id].protoId);
    }
  }

  const getBackerPos = (id: ProtoId, frac: number) => {
    const { start, end } = arcDests.get(id)!;
    // Sign so backer always arcs outward (away from center line x=0)
    const semiMinorCw = -0.75 * Math.sign(start.x) * Math.sign(end.y - start.y);
    return ellipsePosition(start, end, semiMinorCw, PI * frac);
  };

  return (dancer, frac) => {
    if (getRole(dancer.protoId) === backerRole) {
      return getBackerPos(dancer.protoId, frac);
    }
    const backerProto = nonBackerToBacker.get(dancer.protoId)!;
    const displacement = dancer.pos
      .subtract(Dancer.get(backerProto, dancer.state).pos)
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
  const matches = resolveMatches("person_across", init, { roles: "different" });

  const setupSegment = makeImmediateSegment(init, (id, draft) => {
    draft[id].facing = must(
      resolveCardinalDirection("across", draft[id].pos),
      `[poussette] dancer ${id} is too close to the center`,
    );
    const match = matches[id];
    draft[id].hands = hold(
      ["left", match.id, "right"],
      ["right", match.id, "left"],
    );
  });

  const afterSetup = advanceState([setupSegment], init, who);

  const handsFn = (dancer: Dancer) =>
    hold(
      ["left", matches[dancer.protoId].id, "right"],
      ["right", matches[dancer.protoId].id, "left"],
    );

  const halfBeats = instr.full ? instr.beats / 2 : instr.beats;

  const firstHalf: Segment = {
    dur: halfBeats,
    position: makeHalfPoussetteArcPosition(
      instr.backer,
      instr.backerDir,
      matches,
      afterSetup,
      who,
    ),
    hands: handsFn,
    interactedWith: (dancer) => [matches[dancer.protoId].id],
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
    position: makeHalfPoussetteArcPosition(
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
