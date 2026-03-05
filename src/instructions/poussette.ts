import { produce } from "immer";
import { z } from "zod";

import {
  ALL_PROTO_IDS,
  type DancerId,
  getRole,
  type Hand,
  HandSchema,
  projectDancerIdToProtoId,
  type ProtoId,
  type Role,
  RoleSchema,
} from "../contraCore";
import { ellipsePosition, PI, TWO_PI } from "../geometry";
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
 * Arc partners are resolved by temporarily facing dancers across.
 */
export function makePoussetteArcPosition(
  backerRole: Role,
  backerDir: Hand,
  matches: Record<ProtoId, DancerId>,
  state: WorldState,
  who: ReadonlySet<ProtoId>,
  phi: number = PI,
): PositionFn {
  // Face across internally for arc partner resolution (on_left/on_right depend on facing)
  const facedAcross = produce(state, (draft) => {
    for (const id of ALL_PROTO_IDS) {
      draft[id].facing = resolveCardinalDirection("across", draft[id].pos);
    }
  });

  const backerCid = `on_${backerDir}` as CalledDirection;
  const arcPartner = new Map<
    ProtoId,
    { start: typeof state.up_lark_0.pos; end: typeof state.up_lark_0.pos }
  >();
  for (const id of who) {
    if (getRole(id) === backerRole) {
      const found = findDancerInCalledDirection(id, backerCid, facedAcross);
      if (!found) {
        throw new Error(`backer ${id} has no dancer ${backerCid}`);
      }
      arcPartner.set(id, {
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

  return (id, frac, segInit) => {
    if (getRole(id) === backerRole) {
      const { start, end } = arcPartner.get(id)!;
      return ellipsePosition(start, end, 0.5, phi * frac);
    }
    const backerProto = nonBackerToBacker.get(id)!;
    const backerArc = arcPartner.get(backerProto)!;
    const displacement = segInit[id].pos.subtract(segInit[backerProto].pos);
    const backerNow = ellipsePosition(
      backerArc.start,
      backerArc.end,
      0.5,
      phi * frac,
    );
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
  const phi = instr.full ? TWO_PI : PI;

  return [
    setupSegment,
    {
      dur: instr.beats,
      position: makePoussetteArcPosition(
        instr.backer,
        instr.backerDir,
        matches,
        afterSetup,
        who,
        phi,
      ),
      hands: (id) =>
        hold(["left", matches[id], "right"], ["right", matches[id], "left"]),
    },
  ];
};
