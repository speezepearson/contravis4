import * as _gifencNs from "gifenc";

import {
  shiftFrameByProgression,
  shiftFrameUniformly,
  smoothFrame,
  type WeightedFrame,
} from "./averageFrames";
import { Renderer } from "./components/Renderer";
import type { ContraAnimation } from "./instructions/_base";
import { resolveCjsDefault } from "./typecasts";
import type { WorldState } from "./worldState";

// gifenc ships CJS. Vite resolves named exports on the namespace directly;
// Node.js ESM wraps the CJS module.exports as .default.
const { GIFEncoder, quantize, applyPalette } = resolveCjsDefault(
  _gifencNs,
  "GIFEncoder",
);

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

  const dur = animation.dur;
  let baseFrame: WorldState;
  try {
    baseFrame = animation.getFrame(Math.max(0, Math.min(dur, t)));
  } catch {
    return null;
  }
  const samples: WeightedFrame[] = [];
  for (let k = -10; k <= 10; k++) {
    const sampleT = t + k * 0.1 * smoothness;
    const weight = Math.exp(-(k * k) / 200);
    try {
      let sampleFrame: WorldState;
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
        sampleFrame = shiftFrameByProgression(
          rawFrame,
          -wraps * inferredProgression,
        );
      } else {
        const clampedT = Math.max(0, Math.min(dur, sampleT));
        sampleFrame = animation.getFrame(clampedT);
      }
      samples.push({ frame: sampleFrame, weight });
    } catch {
      // Skip this sample — other samples may still be valid
    }
  }

  if (samples.length === 0) return null;
  return smoothFrame(baseFrame, samples);
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
  const gifLoopBeats = 2 * danceLength;
  const beatsPerSecond = bpm / 60;
  const beatStep = beatsPerSecond / fps;
  const delayMs = Math.round(1000 / fps);

  const renderer = new Renderer(ctx, width, height);
  renderer.setZoom(0.5);

  const frames: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }[] = [];

  for (let beat = 0; beat <= gifLoopBeats + beatStep / 2; beat += beatStep) {
    const totalT = Math.min(beat, gifLoopBeats);
    const rep = danceLength > 0 ? Math.floor(totalT / danceLength) : 0;
    const t = danceLength > 0 ? totalT - rep * danceLength : totalT;
    const clampedT = Math.min(t, danceLength);
    const frame = sampleFrame(
      animation,
      clampedT,
      smoothness,
      inferredProgression,
    );
    if (!frame) continue;

    const shiftedFrame =
      inferredProgression !== null && rep > 0
        ? shiftFrameUniformly(frame, rep * inferredProgression)
        : frame;

    renderer.drawFrame(clampedT, shiftedFrame);

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
