import { z } from "zod";

import {
  getRole,
  HandSchema,
  projectDancerIdToProtoId,
  type ProtoId,
  RoleSchema,
} from "../contraCore";
import { ellipsePosition, PI, TWO_PI } from "../geometry";
import { getDancerState } from "../worldState";
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
} from "./_segment";

export const PoussetteInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("poussette"),
  backer: RoleSchema,
  backerDir: HandSchema,
  full: z.boolean(),
});
export type PoussetteInstruction = z.infer<typeof PoussetteInstructionSchema>;

export const poussetteSegments: InstructionAnimator<PoussetteInstruction> = (
  instr,
  init,
  who,
) => {
  // Pair up dancers across the set
  const matches = resolveMatches("across", init, { roles: "different" });

  // Setup: face across and take both hands (right in their left, left in their right)
  const setupSegment = makeImmediateSegment(init, (id, draft) => {
    draft[id].facing = resolveCardinalDirection("across", draft[id].pos);
    const matchId = matches[id];
    draft[id].hands = hold(
      ["left", matchId, "right"],
      ["right", matchId, "left"],
    );
  });

  // Resolve arc partners from the post-setup state (facing matters for on_left/on_right)
  const afterSetup = advanceState([setupSegment], init, who);

  const backerCid = `on_${instr.backerDir}` as CalledDirection;
  const arcPartner = new Map<
    ProtoId,
    { start: typeof init.up_lark_0.pos; end: typeof init.up_lark_0.pos }
  >();
  for (const id of who) {
    if (getRole(id) === instr.backer) {
      const found = findDancerInCalledDirection(id, backerCid, afterSetup);
      if (!found) {
        throw new Error(`backer ${id} has no dancer ${backerCid}`);
      }
      arcPartner.set(id, {
        start: afterSetup[id].pos,
        end: getDancerState(found, afterSetup).pos,
      });
    }
  }

  // Map each non-backer proto to their matched backer proto
  const nonBackerToBacker = new Map<ProtoId, ProtoId>();
  for (const id of who) {
    if (getRole(id) !== instr.backer) {
      nonBackerToBacker.set(id, projectDancerIdToProtoId(matches[id]));
    }
  }

  const phi = instr.full ? TWO_PI : PI;

  return [
    setupSegment,
    {
      dur: instr.beats,
      position: (id, frac, segInit) => {
        if (getRole(id) === instr.backer) {
          const { start, end } = arcPartner.get(id)!;
          return ellipsePosition(start, end, 0.5, phi * frac);
        }
        // Non-backer: maintain initial displacement from matched backer
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
      },
      // Facing stays exactly the same throughout (omitted)
      hands: (id) =>
        hold(["left", matches[id], "right"], ["right", matches[id], "left"]),
    },
  ];
};
