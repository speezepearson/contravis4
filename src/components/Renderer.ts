import type { Vector } from "vecti";

import { type Beats, type Hand, HandSchema } from "../contraCore";
import { ALL_PROTO_IDS, type DancerId, type ProtoId } from "../contraCore";
import { PI } from "../geometry";
import { Dancer, type WorldState } from "../worldState";

const COLORS: Record<ProtoId, { fill: string; stroke: string; label: string }> =
  {
    up_lark_0: { fill: "#4a90d9", stroke: "#6ab0ff", label: "UL" },
    up_robin_0: { fill: "#d94a4a", stroke: "#ff6a6a", label: "UR" },
    down_lark_0: { fill: "#2a60a9", stroke: "#4a80c9", label: "DL" },
    down_robin_0: { fill: "#a92a2a", stroke: "#c94a4a", label: "DR" },
  };

const MARGIN = 40;
const DEFAULT_PX_PER_METER = 200;

/** Extract hand connections from WorldState, deduplicating (each appears from both sides). */
function extractHandConnections(
  protos: WorldState,
): Array<{ a: Dancer; ha: Hand; b: Dancer; hb: Hand }> {
  const connections: Array<{
    a: Dancer;
    ha: Hand;
    b: Dancer;
    hb: Hand;
  }> = [];
  const seen = new Set<string>();

  for (const id of ALL_PROTO_IDS) {
    const dancer = protos[id];
    for (const hand of HandSchema.options) {
      const holding = dancer.hands[hand];
      if (!holding) continue;
      const { theirId, theirHand } = holding;

      // Dedup: normalize so (A,handA,B,handB) and (B,handB,A,handA) share a key
      const key =
        id < theirId || (id === theirId && hand <= theirHand)
          ? `${id}|${hand}|${theirId}|${theirHand}`
          : `${theirId}|${theirHand}|${id}|${hand}`;
      if (seen.has(key)) continue;
      seen.add(key);

      connections.push({
        a: Dancer.get(id, protos),
        ha: hand,
        b: Dancer.get(theirId, protos),
        hb: theirHand,
      });
    }
  }
  return connections;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private usableW: number;
  private usableH: number;
  private xRange!: number;
  private yRange!: number;
  private trails: Partial<Record<ProtoId, { x: number; y: number }[]>> = {};
  private trailLength = 20;
  private zoom = 1;
  private pxPerMeter = DEFAULT_PX_PER_METER;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.usableW = width - 2 * MARGIN;
    this.usableH = height - 2 * MARGIN;
    this.recomputeRanges();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.usableW = width - 2 * MARGIN;
    this.usableH = height - 2 * MARGIN;
    this.recomputeRanges();
  }

  private recomputeRanges() {
    this.yRange = this.usableH / this.pxPerMeter;
    this.xRange = this.usableW / this.pxPerMeter;
  }

  getZoom(): number {
    return this.zoom;
  }

  setZoom(z: number) {
    this.zoom = z;
    this.pxPerMeter = DEFAULT_PX_PER_METER * z;
    this.recomputeRanges();
  }

  clearTrails() {
    this.trails = {};
  }

  worldToCanvas(wx: number, wy: number): [number, number] {
    const cx = MARGIN + ((wx + this.xRange / 2) / this.xRange) * this.usableW;
    const cy = MARGIN + ((this.yRange / 2 - wy) / this.yRange) * this.usableH;
    return [cx, cy];
  }

  canvasToWorld(cx: number, cy: number): [number, number] {
    const wx = ((cx - MARGIN) / this.usableW) * this.xRange - this.xRange / 2;
    const wy = this.yRange / 2 - ((cy - MARGIN) / this.usableH) * this.yRange;
    return [wx, wy];
  }

  drawFrame(_t: Beats, frame: WorldState) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const viewYMin = -this.yRange / 2;
    const viewYMax = this.yRange / 2;

    // Grid lines (set boundaries at x = ±0.5)
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    for (const x of [-0.5, 0.5]) {
      const [cx1, cy1] = this.worldToCanvas(x, viewYMax + 1);
      const [cx2, cy2] = this.worldToCanvas(x, viewYMin - 1);
      ctx.beginPath();
      ctx.moveTo(cx1, cy1);
      ctx.lineTo(cx2, cy2);
      ctx.stroke();
    }

    // Horizontal dividers between hands-fours (every 2m)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#222";
    const firstDivider = Math.floor((viewYMin - 1) / 2) * 2;
    for (let y = firstDivider; y <= viewYMax + 1; y += 2) {
      const [cx1, cy1] = this.worldToCanvas(-this.xRange / 2, y);
      const [cx2, cy2] = this.worldToCanvas(this.xRange / 2, y);
      ctx.beginPath();
      ctx.moveTo(cx1, cy1);
      ctx.lineTo(cx2, cy2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Hand connections
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    const connections = extractHandConnections(frame);
    for (const conn of connections) {
      this.drawHandsForAllCopies(conn.a, conn.ha, conn.b, conn.hb);
    }

    // Dancers tiled every 2m to fill viewport
    const firstCopy = Math.floor((viewYMin - 1) / 2) * 2;
    const lastCopy = Math.ceil((viewYMax + 1) / 2) * 2;
    for (let offset = firstCopy; offset <= lastCopy; offset += 2) {
      for (const id of ALL_PROTO_IDS) {
        const d = frame[id];
        this.drawDancer(
          id,
          d.pos.x,
          d.pos.y + offset,
          d.facing,
          offset === 0 ? 1.0 : 0.35,
        );
      }
    }

    // Update and draw trails
    for (const id of ALL_PROTO_IDS) {
      const d = frame[id];
      if (!this.trails[id]) this.trails[id] = [];
      this.trails[id]!.push({ x: d.pos.x, y: d.pos.y });
      if (this.trails[id]!.length > this.trailLength) this.trails[id]!.shift();
    }

    for (const id of ALL_PROTO_IDS) {
      const trail = this.trails[id];
      if (!trail) continue;
      const color = COLORS[id];
      ctx.strokeStyle = color.fill;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      for (let i = 0; i < trail.length; i++) {
        const [tcx, tcy] = this.worldToCanvas(trail[i].x, trail[i].y);
        if (i === 0) ctx.moveTo(tcx, tcy);
        else ctx.lineTo(tcx, tcy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }

  private handAnchorOffset(
    facing: Vector,
    hand: "left" | "right",
    r: number,
  ): [number, number] {
    const sign = hand === "right" ? 1 : -1;
    return [facing.y * sign * r, facing.x * sign * r];
  }

  private drawHandsForAllCopies(
    da: Dancer,
    handA: "left" | "right",
    db: Dancer,
    handB: "left" | "right",
  ) {
    const ctx = this.ctx;
    const viewYMin = -this.yRange / 2;
    const viewYMax = this.yRange / 2;
    const firstCopy = Math.floor((viewYMin - 1) / 2) * 2;
    const lastCopy = Math.ceil((viewYMax + 1) / 2) * 2;
    const r = 14 * this.zoom;
    const [dxA, dyA] = this.handAnchorOffset(da.facing, handA, r);
    const [dxB, dyB] = this.handAnchorOffset(db.facing, handB, r);
    for (let offset = firstCopy; offset <= lastCopy; offset += 2) {
      ctx.globalAlpha = offset === 0 ? 1.0 : 0.35;
      const [ax, ay] = this.worldToCanvas(da.pos.x, da.pos.y + offset);
      const [bx, by] = this.worldToCanvas(db.pos.x, db.pos.y + offset);
      ctx.beginPath();
      ctx.moveTo(ax + dxA, ay + dyA);
      ctx.lineTo(bx + dxB, by + dyB);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  drawRelationshipLines(
    lines: Array<{
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
    }>,
  ) {
    if (lines.length === 0) return;
    const ctx = this.ctx;

    ctx.strokeStyle = "#4a4";
    ctx.lineWidth = 2;

    ctx.globalAlpha = 0.4;
    for (const { fromX, fromY, toX, toY } of lines) {
      const [ax, ay] = this.worldToCanvas(fromX, fromY);
      const [bx, by] = this.worldToCanvas(toX, toY);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  /** Draw thin pale grey basis arrows from a dancer position. */
  drawBasisArrows(
    posX: number,
    posY: number,
    xBasis: { x: number; y: number },
    yBasis: { x: number; y: number },
  ) {
    const ctx = this.ctx;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;

    for (const [vec, color] of [
      [xBasis, "#999"],
      [yBasis, "#999"],
    ] as const) {
      const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
      if (len < 1e-9) continue;
      const [ax, ay] = this.worldToCanvas(posX, posY);
      const [bx, by] = this.worldToCanvas(posX + vec.x, posY + vec.y);

      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Small arrowhead
      const headLen = 5 * this.zoom;
      const angle = Math.atan2(by - ay, bx - ax);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(
        bx - headLen * Math.cos(angle - 0.4),
        by - headLen * Math.sin(angle - 0.4),
      );
      ctx.moveTo(bx, by);
      ctx.lineTo(
        bx - headLen * Math.cos(angle + 0.4),
        by - headLen * Math.sin(angle + 0.4),
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  drawDancerHighlight(dancer: Dancer) {
    const ctx = this.ctx;

    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    const [cx, cy] = this.worldToCanvas(dancer.pos.x, dancer.pos.y);
    ctx.beginPath();
    ctx.arc(cx, cy, 20 * this.zoom, 0, 2 * PI);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  drawErrorBadge(message: string) {
    const ctx = this.ctx;
    const padding = 8;
    const text = `\u26A0 frame error`;
    ctx.font = "bold 11px monospace";
    const metrics = ctx.measureText(text);
    const boxW = metrics.width + padding * 2;
    const boxH = 16 + padding * 2;
    const x = this.width - boxW - 10;
    const y = 10;

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#331111";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = "#993333";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boxW, boxH);

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "#ff6666";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + padding, y + boxH / 2);

    // Second line: truncated detail
    const detail = message.length > 50 ? message.slice(0, 47) + "..." : message;
    ctx.font = "10px monospace";
    ctx.fillStyle = "#cc8888";
    ctx.fillText(detail, x + padding, y + boxH / 2 + 14);
  }

  drawPreviewKeyframes(frames: WorldState[]) {
    if (frames.length === 0) return;
    const ctx = this.ctx;

    const viewYMin = -this.yRange / 2;
    const viewYMax = this.yRange / 2;
    const firstCopy = Math.floor((viewYMin - 1) / 2) * 2;
    const lastCopy = Math.ceil((viewYMax + 1) / 2) * 2;

    for (let offset = firstCopy; offset <= lastCopy; offset += 2) {
      const baseAlpha = offset === 0 ? 0.3 : 0.12;
      for (const id of ALL_PROTO_IDS) {
        const color = COLORS[id];
        ctx.strokeStyle = color.fill;
        ctx.globalAlpha = baseAlpha;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = 0; i < frames.length; i++) {
          const d = frames[i][id];
          const [cx, cy] = this.worldToCanvas(d.pos.x, d.pos.y + offset);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    const last = frames[frames.length - 1];
    for (let offset = firstCopy; offset <= lastCopy; offset += 2) {
      const ghostAlpha = offset === 0 ? 0.18 : 0.07;
      for (const id of ALL_PROTO_IDS) {
        const d = last[id];
        this.drawGhostDancer(
          id,
          d.pos.x,
          d.pos.y + offset,
          d.facing,
          ghostAlpha,
        );
      }
    }

    ctx.globalAlpha = 1.0;
  }

  drawGhostDancer(
    id: ProtoId,
    x: number,
    y: number,
    facing: Vector,
    alpha = 0.18,
  ) {
    const color = COLORS[id];
    if (!color) return;
    const ctx = this.ctx;
    const [cx, cy] = this.worldToCanvas(x, y);
    const ghostScale = 10 / 14; // ghost is smaller than main dancer
    const rWide = (0.5 / 2) * this.pxPerMeter * ghostScale;
    const rNarrow = (0.3 / 2) * this.pxPerMeter * ghostScale;
    const facingAngle = Math.atan2(-facing.y, facing.x);

    ctx.globalAlpha = alpha;

    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rNarrow, rWide, facingAngle, 0, PI * 2);
    ctx.fill();
    ctx.stroke();

    const ax = cx + facing.x * (rNarrow + 4);
    const ay = cy - facing.y * (rNarrow + 4);
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    ctx.globalAlpha = 1.0;
  }

  hitTestDancer(
    canvasX: number,
    canvasY: number,
    frame: WorldState,
  ): ProtoId | null {
    const r = 14 * this.zoom;
    for (const id of ALL_PROTO_IDS) {
      const d = frame[id];
      const [cx, cy] = this.worldToCanvas(d.pos.x, d.pos.y);
      const dx = canvasX - cx;
      const dy = canvasY - cy;
      if (dx * dx + dy * dy <= r * r) return id;
    }
    return null;
  }

  drawRecentsHighlight(recents: DancerId[], frame: WorldState) {
    if (recents.length === 0) return;
    const ctx = this.ctx;
    const circleR = 20 * this.zoom;

    ctx.strokeStyle = "#ff3333";
    ctx.lineWidth = 2.5;

    for (let i = 0; i < recents.length; i++) {
      const recentAlpha = 0.8 / (i + 1);
      if (recentAlpha < 0.05) break;

      const recentDancer = Dancer.get(recents[i], frame);
      ctx.globalAlpha = recentAlpha;
      const [cx, cy] = this.worldToCanvas(
        recentDancer.pos.x,
        recentDancer.pos.y,
      );
      ctx.beginPath();
      ctx.arc(cx, cy, circleR, 0, PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  drawDancer(id: ProtoId, x: number, y: number, facing: Vector, alpha: number) {
    const color = COLORS[id];
    if (!color) return;
    const ctx = this.ctx;
    const [cx, cy] = this.worldToCanvas(x, y);
    // Oval: 0.5 units wide (perpendicular to facing) × 0.3 units long (along facing)
    const rWide = (0.5 / 2) * this.pxPerMeter; // half-width perpendicular to facing
    const rNarrow = (0.3 / 2) * this.pxPerMeter; // half-length along facing
    // Canvas facing angle (y is flipped)
    const facingAngle = Math.atan2(-facing.y, facing.x);

    ctx.globalAlpha = alpha;

    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rNarrow, rWide, facingAngle, 0, PI * 2);
    ctx.fill();
    ctx.stroke();

    const ax = cx + facing.x * (rNarrow + 6);
    const ay = cy - facing.y * (rNarrow + 6);
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    const headLen = 6;
    const headAngleVal = 0.4;
    const angle = Math.atan2(ay - cy, ax - cx);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax - headLen * Math.cos(angle - headAngleVal),
      ay - headLen * Math.sin(angle - headAngleVal),
    );
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax - headLen * Math.cos(angle + headAngleVal),
      ay - headLen * Math.sin(angle + headAngleVal),
    );
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(color.label, cx, cy);

    ctx.globalAlpha = 1.0;
  }
}
