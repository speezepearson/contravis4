import * as _gifencNs from "gifenc";

import { averageFrames, shiftFrameByProgression } from "./averageFrames";
import { Renderer } from "./components/Renderer";
import type { ContraAnimation } from "./instructions/_base";
import type { WorldState } from "./worldState";

// gifenc ships CJS. Vite resolves named exports on the namespace directly;
// Node.js ESM wraps the CJS module.exports as .default.
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- gifenc ships CJS; need casts to handle Vite vs Node ESM interop
const _g = _gifencNs as Record<string, unknown>;

/* eslint-disable @typescript-eslint/consistent-type-assertions -- see above */
const { GIFEncoder, quantize, applyPalette } = (
  typeof _g["GIFEncoder"] === "function" ? _g : (_g["default"] as object)
) as typeof _gifencNs;
/* eslint-enable @typescript-eslint/consistent-type-assertions */

export interface GifExportOptions {
  width: number;
  height: number;
  fps?: number;
  bpm?: number;
  smoothness?: number;
  inferredProgression?: number | null;
  bgColor?: string;
}

/** User-controllable GIF export settings exposed in the UI. */
export type GifOptions = {
  fps: number;
  width: number;
  height: number;
};

const DEFAULT_BG_COLOR = "#0f0f23";

/**
 * Encode an array of raw RGBA frames into a looping GIF.
 */
export function encodeGifFromFrames(
  frames: { data: Uint8ClampedArray; width: number; height: number }[],
  delay: number,
): Uint8Array {
  if (frames.length === 0) throw new Error("No frames to encode");

  const gif = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    const { data, width, height } = frames[i];
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay,
      ...(i === 0 ? { repeat: 0 } : {}),
    });
  }

  gif.finish();
  return gif.bytes();
}

/**
 * Sample a frame from the animation, applying smoothing with wrap-around
 * when the dance has a defined progression.
 */
function sampleFrame(
  animation: ContraAnimation,
  t: number,
  smoothness: number,
  inferredProgression: number | null,
): WorldState | null {
  if (smoothness <= 0) {
    const clamped = Math.max(0, Math.min(animation.dur, t));
    try {
      return animation.getFrame(clamped);
    } catch {
      return null;
    }
  }

  const N = 10;
  const dur = animation.dur;
  const frames: WorldState[] = [];
  for (let i = 0; i < N; i++) {
    const sampleT = t + smoothness * (i / (N - 1) - 0.5);
    try {
      if (
        inferredProgression !== null &&
        dur > 0 &&
        (sampleT < 0 || sampleT > dur)
      ) {
        const wraps =
          sampleT < 0 ? Math.ceil(-sampleT / dur) : -Math.floor(sampleT / dur);
        const wrappedT = sampleT + wraps * dur;
        const rawFrame = animation.getFrame(
          Math.max(0, Math.min(dur, wrappedT)),
        );
        frames.push(
          shiftFrameByProgression(rawFrame, -wraps * inferredProgression),
        );
      } else {
        const clampedT = Math.max(0, Math.min(dur, sampleT));
        frames.push(animation.getFrame(clampedT));
      }
    } catch {
      // Skip this sample — other samples may still be valid
    }
  }

  if (frames.length === 0) return null;
  return averageFrames(frames);
}

/**
 * Render a dance animation to GIF.
 */
export function exportGif(
  animation: ContraAnimation,
  ctx: CanvasRenderingContext2D,
  options: GifExportOptions,
): Uint8Array {
  const {
    width,
    height,
    fps = 15,
    bpm = 120,
    smoothness = 1,
    inferredProgression = null,
    bgColor = DEFAULT_BG_COLOR,
  } = options;

  const danceLength = animation.dur;
  const beatsPerSecond = bpm / 60;
  const beatStep = beatsPerSecond / fps;
  const delayMs = Math.round(1000 / fps);

  const renderer = new Renderer(ctx, width, height);

  const frames: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }[] = [];

  for (let beat = 0; beat <= danceLength + beatStep / 2; beat += beatStep) {
    const t = Math.min(beat, danceLength);
    const frame = sampleFrame(animation, t, smoothness, inferredProgression);
    if (!frame) continue;

    renderer.drawFrame(t, frame);

    // drawFrame clears to transparent then draws content on top.
    // Fill background behind the rendered content.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    frames.push({
      data: ctx.getImageData(0, 0, width, height).data,
      width,
      height,
    });
  }

  return encodeGifFromFrames(frames, delayMs);
}
