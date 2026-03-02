import { produce } from "immer";
import { z } from "zod";

import { assertNever } from "../utils";
import { disconnectHands } from "../worldState";
import { type Animator, instructionBaseSchemaFields } from "./_base";

export const DropHandsInstructionSchema = z.object({
  ...instructionBaseSchemaFields,
  type: z.literal("drop_hands"),
  beats: z.literal(0),
  which: z.enum(["both", "left", "right", "partner", "shadow", "neighbor"]),
});
export type DropHandsInstruction = z.infer<typeof DropHandsInstructionSchema>;

export const dropHandsAnimator =
  (instr: DropHandsInstruction): Animator =>
  (init, who) => ({
    dur: instr.beats,
    getFrame() {
      return produce(init, (draft) => {
        for (const id of who) {
          switch (instr.which) {
            case "left":
              disconnectHands(draft, id, "left");
              break;
            case "right":
              disconnectHands(draft, id, "right");
              break;
            case "both":
              if (draft[id].hands.left) disconnectHands(draft, id, "left");
              if (draft[id].hands.right) disconnectHands(draft, id, "right");
              break;
            case "partner":
            case "shadow":
            case "neighbor": {
              const actualDropRelationship =
                instr.which === "shadow" ? "partner" : instr.which;
              if (draft[id].hands.left?.[0].base === actualDropRelationship)
                disconnectHands(draft, id, "left");
              if (draft[id].hands.right?.[0].base === actualDropRelationship)
                disconnectHands(draft, id, "right");
              break;
            }
            default:
              assertNever(instr.which);
          }
        }
      });
    },
  });
