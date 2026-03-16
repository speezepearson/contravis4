import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  shiftFrameByProgression,
  shiftFrameUniformly,
  smoothFrame,
  type WeightedFrame,
} from "./averageFrames";
import CommandPane from "./components/CommandPane";
import {
  assignIds,
  type InstructionId,
  type InstructionWithId,
  splitListsWithId,
} from "./components/instructionId";
import {
  CalledIdentifierHighlightContext,
  DancerHighlightContext,
} from "./components/RelationshipHighlightContext";
import { UndoContext } from "./components/UndoContext";
import { ALL_PROTO_IDS, type DancerId, type ProtoId } from "./contraCore";
import { danceToHash } from "./danceUrl";
import { exportGif, type GifOptions } from "./exportGif";
import { findInstructionStartBeat, generateDanceAnimation } from "./generate";
import { inferProgression } from "./inferProgression";
import { type CalledIdentifier } from "./instructions/_base";
import type { InitFormation } from "./instructions/index";
import type { Dance } from "./instructions/index";
import {
  danceLength,
  DanceSchema,
  instructionDuration,
} from "./instructions/index";
import { resolveInitFormation } from "./instructions/index";
import { SnazzyError } from "./snazzyError";
import { assignToGlobalThis } from "./typecasts";
import { useCanvasRenderer } from "./useCanvasRenderer";
import { useUndoRedo } from "./useUndoRedo";
import { isLocalStorageAvailable, try_ } from "./utils";
import { Dancer, sanityCheckWorldState, type WorldState } from "./worldState";

type DanceState = {
  instructions: InstructionWithId[];
  initFormation: InitFormation;
  name: string;
  author: string;
};

const GIF_OPTIONS_KEY = "contravis4-gif-options";

function findInstructionById(
  instrs: InstructionWithId[],
  id: InstructionId,
): InstructionWithId | null {
  for (const i of instrs) {
    if (i.id === id) return i;
    if (i.type === "split") {
      const [listA, listB] = splitListsWithId(i);
      for (const s of [...listA, ...listB]) {
        if (s.id === id) return { ...s, id: s.id };
      }
    }
  }
  return null;
}

function activeInstructionId(
  instructions: InstructionWithId[],
  beat: number,
): InstructionId | null {
  let currentBeat = 0;
  let activeId: InstructionId | null = null;
  for (const instr of instructions) {
    if (currentBeat > beat + 1e-9) break;
    if (instr.type === "split") {
      const rel = beat - currentBeat;
      const [listA, listB] = splitListsWithId(instr);
      let b = 0;
      for (const sub of listA) {
        if (b > rel + 1e-9) break;
        activeId = sub.id;
        b += sub.beats;
      }
      b = 0;
      for (const sub of listB) {
        if (b > rel + 1e-9) break;
        activeId = sub.id;
        b += sub.beats;
      }
    } else {
      activeId = instr.id;
    }
    currentBeat += instructionDuration(instr);
  }
  return activeId;
}

export default function App({
  hashDanceResult,
}: {
  hashDanceResult: { dance: Dance } | { error: string } | null;
}) {
  const hoveredDancerRef = useRef<ProtoId | null>(null);
  const {
    canvasRef,
    canvasContainerRef,
    rendererRef,
    drawFnRef: drawRef,
    hoverFrameRef: lastFrameRef,
    requestDraw,
  } = useCanvasRenderer({
    onHoverDancer: (hit) => {
      if (hit !== hoveredDancerRef.current) {
        hoveredDancerRef.current = hit;
        requestDraw();
      }
    },
  });
  const beatRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  const initialLoadResult = hashDanceResult;
  const [loadError, setLoadError] = useState<string | null>(() =>
    initialLoadResult && "error" in initialLoadResult
      ? initialLoadResult.error
      : null,
  );

  const [playing, setPlaying] = useState(true);
  const [looping, setLooping] = useState(true);
  const [bpm, setBpm] = useState(120);
  const [beat, setBeat] = useState(0);
  const initialDanceState: DanceState = useMemo(() => {
    if (initialLoadResult && "dance" in initialLoadResult) {
      return {
        instructions: assignIds(initialLoadResult.dance.instructions),
        initFormation: initialLoadResult.dance.initFormation,
        name: initialLoadResult.dance.name ?? "",
        author: initialLoadResult.dance.author ?? "",
      };
    }
    return {
      instructions: [],
      initFormation: "improper",
      name: "",
      author: "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only compute once
  }, []);

  const {
    state: danceState,
    setState: setDanceState,
    beginTransient,
    endTransient,
    undo,
    redo,
  } = useUndoRedo(initialDanceState);

  const { instructions, initFormation, name, author } = danceState;

  const setInstructions = useCallback(
    (next: InstructionWithId[]) =>
      setDanceState({ instructions: next, initFormation, name, author }),
    [setDanceState, initFormation, name, author],
  );

  const setInitFormation = useCallback(
    (next: InitFormation) =>
      setDanceState({ instructions, initFormation: next, name, author }),
    [setDanceState, instructions, name, author],
  );

  const setName = useCallback(
    (next: string) =>
      setDanceState({ instructions, initFormation, name: next, author }),
    [setDanceState, instructions, initFormation, author],
  );

  const setAuthor = useCallback(
    (next: string) =>
      setDanceState({ instructions, initFormation, name, author: next }),
    [setDanceState, instructions, initFormation, name],
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [smoothness, setSmoothness] = useState(import.meta.env.DEV ? 0 : 0.5);
  const [exporting, setExporting] = useState(false);
  const [gifOptions, setGifOptions] = useState<GifOptions>(() => {
    const defaults: GifOptions = { fps: 15, width: 400, height: 600 };
    if (!isLocalStorageAvailable()) return defaults;
    const raw = localStorage.getItem(GIF_OPTIONS_KEY);
    if (raw === null) return defaults;
    return try_(() => ({ ...defaults, ...JSON.parse(raw) })) ?? defaults; // DEFAULT_VALUE: fall back to defaults if stored JSON is corrupt
  });

  // Persist dance to URL hash whenever it changes
  useEffect(() => {
    const dance = {
      initFormation,
      instructions,
      ...(name ? { name } : {}),
      ...(author ? { author } : {}),
    };
    void danceToHash(DanceSchema.parse(dance)).then((hash) => {
      history.replaceState(undefined, "", "#" + hash);
    });
  }, [instructions, initFormation, name, author]);

  // Persist GIF options to localStorage whenever they change
  useEffect(() => {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(GIF_OPTIONS_KEY, JSON.stringify(gifOptions));
  }, [gifOptions]);

  const [hoveredInstructionId, setHoveredInstructionId] =
    useState<InstructionId | null>(null);

  const {
    animation,
    errors: generateErrors,
    warnings: velocityWarnings,
  } = useMemo(
    () =>
      generateDanceAnimation(instructions, resolveInitFormation(initFormation)),
    [instructions, initFormation],
  );
  const DANCE_LENGTH = useMemo(() => danceLength(instructions), [instructions]);
  const inferredProgression = useMemo(
    () =>
      animation
        ? inferProgression(animation, resolveInitFormation(initFormation))
        : null,
    [animation, initFormation],
  );
  useEffect(() => {
    for (const err of generateErrors) {
      console.error(err);
    }
  }, [generateErrors]);

  // Per-instruction warnings (sanity-check + velocity), computed from keyframe samples
  const warningsById = useMemo(() => {
    const map = new Map<
      InstructionId,
      { beat: number; warnings: SnazzyError[] }
    >();
    if (!animation || generateErrors.length > 0) return map;

    // Build instruction ref → id mapping (including split sub-instructions)
    const refToId = new Map<object, InstructionId>();
    for (const instr of instructions) {
      refToId.set(instr, instr.id);
      if (instr.type === "split") {
        const [listA, listB] = splitListsWithId(instr);
        for (const sub of [...listA, ...listB]) {
          refToId.set(sub, sub.id);
        }
      }
    }

    // Collect velocity warnings (keyed by instruction reference → id)
    for (const [instrRef, animWarnings] of velocityWarnings) {
      const id = refToId.get(instrRef);
      if (id !== undefined) {
        // Use the beat from the earliest warning
        const earliest = animWarnings.reduce((a, b) =>
          a.beat < b.beat ? a : b,
        );
        map.set(id, {
          beat: earliest.beat,
          warnings: animWarnings.map((w) => w.warning),
        });
      }
    }

    // Build a list of (startBeat, endBeat, instructionId) spans
    const spans: Array<{
      id: InstructionId;
      start: number;
      end: number;
    }> = [];
    let beat = 0;
    for (const instr of instructions) {
      const dur = instructionDuration(instr);
      if (instr.type === "split") {
        const [listA, listB] = splitListsWithId(instr);
        for (const list of [listA, listB]) {
          let subBeat = beat;
          for (const sub of list) {
            spans.push({
              id: sub.id,
              start: subBeat,
              end: subBeat + sub.beats,
            });
            subBeat += sub.beats;
          }
        }
      } else {
        spans.push({ id: instr.id, start: beat, end: beat + dur });
      }
      beat += dur;
    }

    // Sample keyframes at quarter-beat intervals for sanity-check warnings
    const STEP = 0.25;
    const nSteps = Math.ceil(beat / STEP);

    // For each instruction, find the earliest keyframe with warnings
    for (const span of spans) {
      if (map.has(span.id)) continue; // already has velocity warnings
      const startStep = Math.floor(span.start / STEP);
      // Exclusive end: don't sample at or beyond the instruction boundary
      const endStep = Math.min(Math.ceil(span.end / STEP) - 1, nSteps);
      for (let i = startStep; i <= endStep; i++) {
        const t = Math.min(i * STEP, animation.dur);
        try {
          const frame = animation.getFrame(t);
          const warnings = sanityCheckWorldState(frame);
          const snazzyWarnings = warnings.filter(
            (w): w is SnazzyError => w instanceof SnazzyError,
          );
          if (snazzyWarnings.length > 0) {
            map.set(span.id, {
              beat: t - span.start,
              warnings: snazzyWarnings,
            });
            break;
          }
        } catch {
          // SWALLOW_EXCEPTION: frame may fail to generate due to animation errors
          break;
        }
      }
    }

    return map;
  }, [animation, generateErrors, velocityWarnings, instructions]);

  // Compute preview frames when hovering over an instruction
  const previewFrames = useMemo(() => {
    if (!hoveredInstructionId || !animation) return [];
    const instr = findInstructionById(instructions, hoveredInstructionId);
    if (!instr) return [];
    const startBeat = findInstructionStartBeat(instructions, instr) ?? 0;
    const dur = instructionDuration(instr);
    if (dur <= 0) return [];

    // Sample the animation every quarter-beat during this instruction
    const SAMPLE_COUNT = Math.max(1, Math.round(dur * 4));
    const frames = [];
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const t = startBeat + (dur * i) / SAMPLE_COUNT;
      try {
        frames.push(animation.getFrame(t));
      } catch {
        // SWALLOW_EXCEPTION: t may exceed animation duration if there was a generate error
        break;
      }
    }
    return frames;
  }, [hoveredInstructionId, instructions, animation]);

  // Relationship highlight: ref-based to avoid re-renders on fast mouse movements
  const highlightedRelRef = useRef<CalledIdentifier | null>(null);
  const highlightRelRafRef = useRef(0);

  // Dancer highlight from snazzy errors: ref-based to avoid re-renders
  const highlightedDancerRef = useRef<DancerId | null>(null);
  const highlightDancerRafRef = useRef(0);

  const lastFrameWarnRef = useRef(0);
  const nProgressionsRef = useRef(0);

  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer || !animation) return;

    let t = beatRef.current;
    if (t > animation.dur) t = animation.dur;
    if (t < 0) t = 0;

    let frame: WorldState | null = null;
    let frameError: string | null = null;

    try {
      if (smoothness > 0) {
        const dur = animation.dur;
        const baseFrame = animation.getFrame(t);
        const samples: WeightedFrame[] = [];
        let lastSampleError: string | null = null;
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
              // Wrap around with progression offset
              const wraps =
                sampleT < 0
                  ? Math.ceil(-sampleT / dur)
                  : -Math.floor(sampleT / dur);
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
          } catch (e) {
            lastSampleError = e instanceof Error ? e.message : String(e);
          }
        }
        if (samples.length > 0) {
          frame = smoothFrame(baseFrame, samples);
        } else {
          frameError =
            lastSampleError ?? "all frame samples failed sanity check";
        }
      } else {
        frame = animation.getFrame(t);
      }
    } catch (e) {
      frameError = e instanceof Error ? e.message : String(e);
    }

    if (frame && nProgressionsRef.current !== 0) {
      frame = shiftFrameUniformly(frame, nProgressionsRef.current);
    }

    if (frame) {
      lastFrameRef.current = frame;
      renderer.drawFrame(t, frame);

      // Draw recents highlight for hovered dancer
      const hoveredDancer = hoveredDancerRef.current;
      if (hoveredDancer) {
        renderer.drawRecentsHighlight(frame[hoveredDancer].recents, frame);
      }

      // Draw relationship highlight lines
      const highlightedRel = highlightedRelRef.current;
      if (highlightedRel) {
        const lines: Array<{
          fromX: number;
          fromY: number;
          toX: number;
          toY: number;
        }> = [];
        for (const id of ALL_PROTO_IDS) {
          const target = try_(() =>
            Dancer.get(id, frame).resolveCalledIdentifier(highlightedRel, {
              checkDistance: false,
            }),
          );
          if (target instanceof Error || !target) continue;
          const from = frame[id];
          const to = target;
          lines.push({
            fromX: from.pos.x,
            fromY: from.pos.y,
            toX: to.pos.x,
            toY: to.pos.y,
          });
        }
        renderer.drawRelationshipLines(lines);
      }

      // Draw dancer highlight ring (from snazzy error hover)
      const highlightedDancer = highlightedDancerRef.current;
      if (highlightedDancer) {
        renderer.drawDancerHighlight(Dancer.get(highlightedDancer, frame));
      }

      // Draw preview keyframes overlay
      if (previewFrames.length > 0) {
        renderer.drawPreviewKeyframes(previewFrames);
      }
    }

    if (frameError) {
      renderer.drawErrorBadge(frameError);
      const now = Date.now();
      if (now - lastFrameWarnRef.current > 1000) {
        console.warn("Frame sanity check failed:", frameError);
        lastFrameWarnRef.current = now;
      }
    }

    setBeat(beatRef.current);
  }, [
    rendererRef,
    lastFrameRef,
    animation,
    inferredProgression,
    previewFrames,
    smoothness,
  ]);

  // Keep drawRef in sync so stable callbacks can always call the latest draw
  useEffect(() => {
    drawRef.current = draw;
  });

  // Debug hook for browser automation testing
  useEffect(() => {
    assignToGlobalThis("__debug", {
      scrub: (beat: number) => {
        beatRef.current = beat;
        nProgressionsRef.current %= 2;
        rendererRef.current?.clearTrails();
        drawRef.current();
      },
      setBeat: (beat: number) => {
        beatRef.current = beat;
        drawRef.current();
      },
      getNProgressions: () => nProgressionsRef.current,
      addProgression: (n: number) => {
        nProgressionsRef.current += n;
        nProgressionsRef.current %= 2;
        drawRef.current();
      },
    });
  });

  useEffect(() => {
    nProgressionsRef.current %= 2;
    drawRef.current();
  }, [drawRef, animation, smoothness]);

  const setHighlightedRelationship = useCallback(
    (cid: CalledIdentifier | null) => {
      highlightedRelRef.current = cid;
      cancelAnimationFrame(highlightRelRafRef.current);
      highlightRelRafRef.current = requestAnimationFrame(() =>
        drawRef.current(),
      );
    },
    [drawRef],
  );

  const setHighlightedDancer = useCallback(
    (id: DancerId | null) => {
      highlightedDancerRef.current = id;
      cancelAnimationFrame(highlightDancerRafRef.current);
      highlightDancerRafRef.current = requestAnimationFrame(() =>
        drawRef.current(),
      );
    },
    [drawRef],
  );

  const downloadGif = useCallback(() => {
    if (!animation) return;
    setExporting(true);
    // Yield to let the UI show the "Exporting..." state before blocking
    setTimeout(() => {
      const { width: w, height: h, fps } = gifOptions;
      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext("2d")!;

      const gifBytes = exportGif(animation, offCtx, {
        width: w,
        height: h,
        fps,
        bpm,
        smoothness,
        inferredProgression,
      });

      if (!(gifBytes.buffer instanceof ArrayBuffer)) {
        throw new Error("gifBytes.buffer is not an ArrayBuffer");
      }
      const blob = new Blob([gifBytes.buffer], {
        type: "image/gif",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dance.gif";
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 50);
  }, [animation, bpm, smoothness, inferredProgression, gifOptions]);

  // Redraw when animation or preview change
  useEffect(() => {
    const id = requestAnimationFrame(() => drawRef.current());
    return () => cancelAnimationFrame(id);
  }, [drawRef, animation, previewFrames]);

  // Animation loop
  const animateRef = useRef<(timestamp: number) => void>(undefined);
  useEffect(() => {
    animateRef.current = (timestamp: number) => {
      if (lastTimestampRef.current === null)
        lastTimestampRef.current = timestamp;

      const dt = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      beatRef.current += dt * (bpm / 60);
      if (beatRef.current > DANCE_LENGTH) {
        if (looping) {
          beatRef.current = 0;
          rendererRef.current?.clearTrails();
          if (inferredProgression !== null) {
            nProgressionsRef.current += inferredProgression;
            nProgressionsRef.current %= 2;
          }
        } else {
          beatRef.current = DANCE_LENGTH;
          setPlaying(false);
          drawRef.current();
          return;
        }
      }

      drawRef.current();
      rafRef.current = requestAnimationFrame((ts) => animateRef.current!(ts));
    };
  });

  // Start/stop animation loop
  useEffect(() => {
    if (playing) {
      lastTimestampRef.current = null;
      rafRef.current = requestAnimationFrame((ts) => animateRef.current!(ts));
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const scrub = useCallback(
    (val: number) => {
      const pct = val / 1000;
      beatRef.current = pct * DANCE_LENGTH;
      nProgressionsRef.current %= 2;
      rendererRef.current?.clearTrails();
      drawRef.current();
    },
    [drawRef, rendererRef, DANCE_LENGTH],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Undo/redo works even when focused on inputs
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((mod && e.key === "z" && e.shiftKey) || (mod && e.key === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      const tag =
        e.target instanceof HTMLElement ? e.target.tagName : undefined;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [togglePlay, undo, redo]);

  const handleHoverInstruction = useCallback((id: InstructionId | null) => {
    setHoveredInstructionId(id);
  }, []);

  const handleEditInstruction = useCallback(
    (id: InstructionId) => {
      const instr = findInstructionById(instructions, id);
      if (!instr) return;
      const startBeat = findInstructionStartBeat(instructions, instr);
      if (startBeat !== null) {
        beatRef.current = startBeat;
        nProgressionsRef.current %= 2;
        rendererRef.current?.clearTrails();
        drawRef.current();
      }
    },
    [drawRef, rendererRef, instructions],
  );

  const handleSkipToInstruction = useCallback(
    (id: InstructionId) => {
      const instr = findInstructionById(instructions, id);
      if (!instr) return;
      const startBeat = findInstructionStartBeat(instructions, instr);
      if (startBeat !== null) {
        beatRef.current = startBeat;
        nProgressionsRef.current %= 2;
        rendererRef.current?.clearTrails();
        drawRef.current();
      }
    },
    [drawRef, rendererRef, instructions],
  );

  const scrubberValue =
    DANCE_LENGTH > 0 ? Math.round((beat / DANCE_LENGTH) * 1000) : 0;

  const desktopControlsBlock = (
    <>
      <div className="controls">
        <button onClick={togglePlay}>
          {playing ? "\u23F8 Pause" : "\u25B6 Play"}
        </button>
        <label>
          <input
            type="checkbox"
            checked={looping}
            onChange={(e) => setLooping(e.target.checked)}
          />{" "}
          Loop
        </label>
        <input
          type="range"
          min={0}
          max={1000}
          value={scrubberValue}
          onChange={(e) => scrub(Number(e.target.value))}
        />
        <div className="beat-display">Beat {beat.toFixed(1)}</div>
      </div>
      <div className="controls">
        <label>
          BPM:{" "}
          <input
            type="number"
            min={60}
            max={120}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
        </label>
        <label>
          Smoothness:{" "}
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={smoothness}
            onChange={(e) => setSmoothness(Number(e.target.value))}
          />
        </label>
        <span
          className="tooltip-trigger"
          title="Make dancers move more or less smoothly. (~= smoothing window width)"
        >
          (?)
        </span>
      </div>
      <div className="controls">
        <button onClick={downloadGif} disabled={exporting || !animation}>
          {exporting ? "Exporting..." : "Download GIF"}
        </button>
        <details className="gif-options">
          <summary>GIF Options</summary>
          <label>
            FPS:{" "}
            <input
              type="number"
              min={1}
              max={30}
              value={gifOptions.fps}
              onChange={(e) =>
                setGifOptions((prev) => ({
                  ...prev,
                  fps: Number(e.target.value),
                }))
              }
            />
          </label>
          <label>
            Width:{" "}
            <input
              type="number"
              min={100}
              max={1200}
              step={50}
              value={gifOptions.width}
              onChange={(e) =>
                setGifOptions((prev) => ({
                  ...prev,
                  width: Number(e.target.value),
                }))
              }
            />
          </label>
          <label>
            Height:{" "}
            <input
              type="number"
              min={100}
              max={1800}
              step={50}
              value={gifOptions.height}
              onChange={(e) =>
                setGifOptions((prev) => ({
                  ...prev,
                  height: Number(e.target.value),
                }))
              }
            />
          </label>
        </details>
      </div>
    </>
  );

  const undoContextValue = useMemo(
    () => ({ beginTransient, endTransient, undo, redo }),
    [beginTransient, endTransient, undo, redo],
  );

  const commandPaneProps = {
    instructions,
    setInstructions,
    initFormation,
    setInitFormation,
    name,
    setName,
    author,
    setAuthor,
    setDanceState,
    activeId: activeInstructionId(instructions, beat),
    generateErrors,
    warningsById,
    animation,
    onHoverInstruction: handleHoverInstruction,
    onEditInstruction: handleEditInstruction,
    onSkipToInstruction: handleSkipToInstruction,
  };

  return (
    <UndoContext.Provider value={undoContextValue}>
      <CalledIdentifierHighlightContext.Provider
        value={setHighlightedRelationship}
      >
        <DancerHighlightContext.Provider value={setHighlightedDancer}>
          <div className="app-layout">
            {loadError && (
              <div className="localstorage-error">
                <strong>Could not load saved dance:</strong>
                <pre>{loadError}</pre>
                <button onClick={() => setLoadError(null)}>Dismiss</button>
              </div>
            )}
            <div className="vis-column">
              <div className="canvas-container" ref={canvasContainerRef}>
                <canvas ref={canvasRef} />
              </div>
            </div>

            {/* Desktop sidebar */}
            <div className="sidebar-column">
              <div className="sidebar-instructions">
                <CommandPane {...commandPaneProps} />
              </div>
              <div className="sidebar-controls">{desktopControlsBlock}</div>
            </div>

            {/* Mobile: compact controls bar */}
            <div className="mobile-controls">
              <div className="controls">
                <button onClick={togglePlay}>
                  {playing ? "\u23F8 Pause" : "\u25B6 Play"}
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={looping}
                    onChange={(e) => setLooping(e.target.checked)}
                  />{" "}
                  Loop
                </label>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={scrubberValue}
                  onChange={(e) => scrub(Number(e.target.value))}
                />
                <div className="beat-display">Beat {beat.toFixed(1)}</div>
              </div>
              <div className="controls">
                <label>
                  BPM:{" "}
                  <input
                    type="number"
                    min={60}
                    max={120}
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                  />
                </label>
              </div>
              <div className="controls">
                <label>
                  Smoothness:{" "}
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={smoothness}
                    onChange={(e) => setSmoothness(Number(e.target.value))}
                  />
                </label>
                <span
                  className="tooltip-trigger"
                  title="Make dancers move more or less smoothly. (~= smoothing window width)"
                >
                  (?)
                </span>
              </div>
              <button onClick={downloadGif} disabled={exporting || !animation}>
                {exporting ? "..." : "GIF"}
              </button>
              <button
                className="drawer-toggle"
                onClick={() => setDrawerOpen(true)}
              >
                {"\u25B2 Edit Instructions"}
              </button>
            </div>

            {/* Mobile: full-screen instruction editor */}
            {drawerOpen && (
              <div className="instruction-drawer open">
                <button
                  className="drawer-toggle"
                  onClick={() => setDrawerOpen(false)}
                >
                  {"\u25BC Back to Visualization"}
                </button>
                <CommandPane {...commandPaneProps} />
              </div>
            )}
          </div>
        </DancerHighlightContext.Provider>
      </CalledIdentifierHighlightContext.Provider>
    </UndoContext.Provider>
  );
}
