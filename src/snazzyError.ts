import type { DancerId } from "./contraCore";
import type { CalledIdentifier } from "./identifiers";

export type SnazzySegment =
  | string
  | { dancerId: DancerId }
  | { cid: CalledIdentifier };

function cidToString(cid: CalledIdentifier): string {
  switch (cid.type) {
    case "label":
      return cid.label;
    case "PersonInDirection":
      return `person_${cid.dir}`;
    case "roleFiltered":
      return `${cid.role}_${cidToString(cid.base)}`;
    case "byRole":
      return `larks_${cidToString(cid.larks)}_robins_${cidToString(cid.robins)}`;
    case "byProgDir":
      return `ups_${cidToString(cid.ups)}_downs_${cidToString(cid.downs)}`;
  }
}

function segmentToString(seg: SnazzySegment): string {
  if (typeof seg === "string") return seg;
  if ("dancerId" in seg) return seg.dancerId;
  return cidToString(seg.cid);
}

export class SnazzyError extends Error {
  readonly segments: SnazzySegment[];
  constructor(segments: SnazzySegment[]) {
    super(segments.map(segmentToString).join(" "));
    this.segments = segments;
  }
}
