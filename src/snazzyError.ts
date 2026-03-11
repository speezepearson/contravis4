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
