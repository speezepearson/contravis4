import { type DancerId, type Hand } from "../contraCore";
import { Dancer, type DancerHandPointer } from "../worldState";

// ── Hand primitives ─────────────────────────────────────────────────────

export function hold(
  ...args:
    | [[Hand, DancerId, Hand]]
    | [["left", DancerId, Hand], ["right", DancerId, Hand]]
): Dancer["hands"] {
  const result: Partial<Record<Hand, DancerHandPointer>> = {};
  for (const [hand, theirId, theirHand] of args) {
    result[hand] = { theirId, theirHand };
  }
  return result;
}
