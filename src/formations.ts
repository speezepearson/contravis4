import {
  ALL_PROTO_IDS,
  type DancerId,
  type ProtoId,
  protoIdToDancerId,
} from "./contraCore";
import { must, type NTuple } from "./utils";
import { buildProtoRecord, Dancer, type WorldState } from "./worldState";

export function resolveRings(
  state: WorldState,
): Record<ProtoId, NTuple<4, DancerId>> {
  const getRH = (id: DancerId) =>
    must(
      Dancer.get(id, state).resolveCalledIdentifier("person_in_right_hand"),
      `[rings] ${id} has nobody in their right hand`,
    );
  return buildProtoRecord((id) => {
    const r = getRH(id);
    const rr = getRH(r.id);
    const rrr = getRH(rr.id);
    const rrrr = getRH(rrr.id);
    if (rrrr.id !== id)
      throw new Error(
        `[rings] following right hands: ${id} -> ${r.id} -> ${rr.id} -> ${rrr.id} -> ${rrrr.id} !== ${id}`,
      );

    const ring: NTuple<4, DancerId> = [id, r.id, rr.id, rrr.id];
    if (!(new Set(ring).size === 4))
      throw new Error(
        `[rings] following right hands: ${id} -> ${r.id} -> ${rr.id} -> ${rrr.id} -> ${rrrr.id} -> ... does not contain 4 people`,
      );
    return ring;
  });
}
export function resolveShortLines(
  state: WorldState,
): Record<ProtoId, NTuple<4, DancerId>> {
  return buildProtoRecord((protoId) => {
    const protoY = state[protoId].pos.y;

    const line: { id: DancerId; x: number }[] = [];

    for (const otherProtoId of ALL_PROTO_IDS) {
      const dyBase = state[otherProtoId].pos.y - protoY;
      const oBest = Math.round(-dyBase / 2);

      // Find the offset copy closest in y
      let bestId: DancerId | null = null;
      let bestYDist = Infinity;
      let bestX = 0;
      for (let o = oBest - 1; o <= oBest + 1; o++) {
        const id = protoIdToDancerId(otherProtoId, o);
        const target = Dancer.get(id, state);
        const yDist = Math.abs(target.pos.y - protoY);
        if (yDist < bestYDist) {
          bestId = id;
          bestYDist = yDist;
          bestX = target.pos.x;
        }
      }

      if (bestYDist > 0.5) {
        throw new Error(
          `resolveShortLines: closest copy of ${otherProtoId} is ${bestYDist.toFixed(3)} away in y from ${protoId} (max 0.5)`,
        );
      }

      line.push({ id: bestId!, x: bestX });
    }

    line.sort((a, b) => a.x - b.x);
    return line.map((c) => c.id) as NTuple<4, DancerId>;
  });
}
