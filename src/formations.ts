import { ALL_PROTO_IDS, type ProtoId } from "./contraCore";
import { getDir, getDist } from "./geometry";
import { SnazzyError } from "./snazzyError";
import { indexOf, isNTuple, must, type NTuple, safeThreshold } from "./utils";
import { Dancer, findNearbyDancers, getCycle } from "./worldState";

export function resolveRing(dancer: Dancer): NTuple<4, Dancer> {
  return getCycle(dancer, (d) =>
    must(d.resolveCalledIdentifier("person_in_right_hand"), [
      { dancerId: d.id },
      "has nobody in their right hand",
    ]),
  );
}

export function resolveShortLine(dancer: Dancer): NTuple<4, Dancer> {
  const line = Object.values(getGroupOfFour(dancer, { by: [preferCloser] }));
  for (const d of line) {
    if (Math.abs(d.pos.y - dancer.pos.y) > 0.5) {
      throw new SnazzyError([
        "resolveShortLine: closest copy of ",
        { dancerId: d.id },
        ` is ${Math.abs(d.pos.y - dancer.pos.y).toFixed(3)} away in y from `,
        { dancerId: dancer.id },
        " (max 0.5)",
      ]);
    }
  }

  line.sort((a, b) => a.pos.x - b.pos.x);
  if (!isNTuple(line, 4))
    throw new Error(`resolveShortLine: line has ${line.length} dancers, not 4`);
  return line;
}

export type Tiebreaker = (
  d: Dancer,
  [cand1, cand2]: [Dancer, Dancer],
) => Dancer | undefined;
export const preferCloser: Tiebreaker = (d, [cand1, cand2]) => {
  const dist1 = getDist(d.pos, cand1.pos);
  const dist2 = getDist(d.pos, cand2.pos);
  return safeThreshold(dist1 - dist2, { neg: cand1, pos: cand2, tol: 0.2 });
};
export const preferOneInFront: Tiebreaker = (d, [cand1, cand2]) => {
  const inFront1 = d.facing.dot(getDir({ from: d.pos, to: cand1.pos })) > 0.2;
  const inFront2 = d.facing.dot(getDir({ from: d.pos, to: cand2.pos })) > 0.2;
  if (inFront1 && !inFront2) return cand1;
  if (!inFront1 && inFront2) return cand2;
  return undefined;
};
export const preferRecent: Tiebreaker = (d, [cand1, cand2]) => {
  const rec1 = indexOf(d.recents, cand1.id) ?? Infinity;
  const rec2 = indexOf(d.recents, cand2.id) ?? Infinity;
  if (rec1 < rec2) return cand1;
  if (rec2 < rec1) return cand2;
  return undefined;
};

type AtLeastOne<T> = [T, ...T[]];

export function getHandsFourAdjacents(
  d: Dancer,
  { by }: { by: AtLeastOne<Tiebreaker> },
): [Dancer, Dancer] {
  const choose = (id: ProtoId) => {
    const cands = findNearbyDancers(d.pos, id, d.worldState);

    for (const tiebreaker of by) {
      const res = tiebreaker(d, cands);
      if (res) return res;
    }
    throw new SnazzyError([
      { dancerId: d.id },
      `can't determine most appropriate ${cands[0].dir} ${cands[0].role}:`,
      ...cands.map((c) => ({ dancerId: c.id })),
      `are all tied by ${by.map((b) => `${b.name ?? "<???>"}`).join(", ")}`,
    ]);
  };

  const cwProtoIds = [
    "up_lark_0",
    "up_robin_0",
    "down_lark_0",
    "down_robin_0",
  ] as const;
  const i = must(indexOf(cwProtoIds, d.protoId));
  return [choose(cwProtoIds[(i + 3) % 4]), choose(cwProtoIds[(i + 1) % 4])];
}

export function getGroupOfFour(
  d: Dancer,
  { by }: { by: AtLeastOne<Tiebreaker> },
): NTuple<4, Dancer> {
  const [dl, dr] = getHandsFourAdjacents(d, { by }).sort();

  const [drl, drr] = getHandsFourAdjacents(dr, { by }).sort();
  if (drl.id !== d.id)
    throw new SnazzyError([
      "confusion how to get into groups of four: ",
      { dancerId: d.id },
      " -> ",
      { dancerId: dl.id },
      " -> ",
      { dancerId: drl.id },
    ]);

  const [drrl, drrr] = getHandsFourAdjacents(drr, { by }).sort();
  if (drrl.id !== dr.id)
    throw new SnazzyError([
      "confusion how to get into groups of four: ",
      { dancerId: dr.id },
      " -> ",
      { dancerId: drr.id },
      " -> ",
      { dancerId: drrl.id },
    ]);

  const [drrrl, drrrr] = getHandsFourAdjacents(drrr, { by }).sort();
  if (drrrl.id !== drr.id)
    throw new SnazzyError([
      "confusion how to get into groups of four: ",
      { dancerId: drr.id },
      " -> ",
      { dancerId: drrr.id },
      " -> ",
      { dancerId: drrrl.id },
    ]);

  if (drrrr.id !== d.id)
    throw new SnazzyError([
      "confusion how to get into groups of four: ",
      { dancerId: d.id },
      " -> ",
      { dancerId: dr.id },
      " -> ",
      { dancerId: drr.id },
      " -> ",
      { dancerId: drrr.id },
      " -> ",
      { dancerId: drrrr.id },
      " !== ",
      { dancerId: d.id },
    ]);

  const all = [d, dr, drr, drrr];
  if (new Set(all.map((d) => d.id)).size !== 4)
    throw new SnazzyError([
      "confusion how to get into groups of four: ",
      ...all.map((d) => ({ dancerId: d.id })),
    ]);

  all.sort(
    (a, b) =>
      must(indexOf(ALL_PROTO_IDS, a.protoId)) -
      must(indexOf(ALL_PROTO_IDS, b.protoId)),
  );
  if (!isNTuple(all, 4)) throw new Error("unreachable");
  return all;
}
