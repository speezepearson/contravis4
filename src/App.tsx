import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { averageFrames, shiftFrameByProgression } from "./averageFrames";
import CommandPane from "./components/CommandPane";
import {
  CalledIdentifierHighlightContext,
  DancerHighlightContext,
} from "./components/RelationshipHighlightContext";
import { Renderer } from "./components/Renderer";
import { UndoContext } from "./components/UndoContext";
import { ALL_PROTO_IDS, type ProtoId } from "./contraCore";
import { exportGif, type GifOptions } from "./exportGif";
import {
  findInstructionStartBeat,
  generateDanceAnimation,
  splitLists,
} from "./generate";
import { formatDanceParseError } from "./generate";
import { inferProgression } from "./inferProgression";
import { type CalledIdentifier } from "./instructions/_base";
import type {
  InitFormation,
  Instruction,
  InstructionId,
} from "./instructions/index";
import type { Dance } from "./instructions/index";
import {
  danceLength,
  DanceSchema,
  instructionDuration,
  InstructionSchema,
} from "./instructions/index";
import { resolveInitFormation } from "./instructions/index";
import { useUndoRedo } from "./useUndoRedo";
import { isLocalStorageAvailable, try_ } from "./utils";
import { Dancer, type WorldState } from "./worldState";

type DanceState = { instructions: Instruction[]; initFormation: InitFormation };

const LOCALSTORAGE_KEY = "contravis4-dance";

function loadDanceFromLocalStorage():
  | { dance: Dance }
  | { error: string }
  | null {
  if (!isLocalStorageAvailable()) return null;
  const raw = localStorage.getItem(LOCALSTORAGE_KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      error: `Saved dance JSON is malformed: ${e instanceof SyntaxError ? e.message : String(e)}`,
    };
  }

  const result = DanceSchema.safeParse(parsed);
  if (!result.success) {
    return { error: formatDanceParseError(result.error, parsed) };
  }
  return { dance: result.data };
}

function findInstructionById(
  instrs: Instruction[],
  id: InstructionId,
): Instruction | null {
  for (const i of instrs) {
    if (i.id === id) return i;
    if (i.type === "split") {
      const [listA, listB] = splitLists(i);
      for (const s of [...listA, ...listB]) {
        if (s.id === id) return InstructionSchema.parse(s);
      }
    }
  }
  return null;
}

function activeInstructionId(
  instructions: Instruction[],
  beat: number,
): InstructionId | null {
  let currentBeat = 0;
  let activeId: InstructionId | null = null;
  for (const instr of instructions) {
    if (currentBeat > beat + 1e-9) break;
    if (instr.type === "split") {
      const rel = beat - currentBeat;
      const [listA, listB] = splitLists(instr);
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

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const beatRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const drawRef = useRef<() => void>(() => {});

  const [initialLoadResult] = useState(() => loadDanceFromLocalStorage());
  const [localStorageError, setLocalStorageError] = useState<string | null>(
    () =>
      initialLoadResult && "error" in initialLoadResult
        ? initialLoadResult.error
        : null,
  );

  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(true);
  const [bpm, setBpm] = useState(120);
  const [beat, setBeat] = useState(0);
  const initialDanceState: DanceState = useMemo(
    () => ({
      instructions:
        initialLoadResult && "dance" in initialLoadResult
          ? initialLoadResult.dance.instructions
          : [],
      initFormation:
        initialLoadResult && "dance" in initialLoadResult
          ? initialLoadResult.dance.initFormation
          : "improper",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only compute once
    [],
  );

  const {
    state: danceState,
    setState: setDanceState,
    beginTransient,
    endTransient,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo(initialDanceState);

  const { instructions, initFormation } = danceState;

  const setInstructions = useCallback(
    (next: Instruction[]) =>
      setDanceState({ instructions: next, initFormation }),
    [setDanceState, initFormation],
  );

  const setInitFormation = useCallback(
    (next: InitFormation) =>
      setDanceState({ instructions, initFormation: next }),
    [setDanceState, instructions],
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [smoothness, setSmoothness] = useState(import.meta.env.DEV ? 0 : 1);
  const [exporting, setExporting] = useState(false);
  const [gifOptions, setGifOptions] = useState<GifOptions>({
    fps: 15,
    width: 400,
    height: 600,
  });

  // Persist dance to localStorage whenever it changes
  useEffect(() => {
    if (!isLocalStorageAvailable()) return;
    const dance = { initFormation, instructions };
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(dance));
  }, [instructions, initFormation]);

  const [hoveredInstructionId, setHoveredInstructionId] =
    useState<InstructionId | null>(null);

  const { animation, errors: generateErrors } = useMemo(
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

  // Compute preview frames when hovering over an instruction
  const previewFrames = useMemo(() => {
    if (!hoveredInstructionId || !animation) return [];
    const instr = findInstructionById(instructions, hoveredInstructionId);
    if (!instr) return [];
    const startBeat =
      findInstructionStartBeat(instructions, hoveredInstructionId) ?? 0;
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

  // Dancer hover: ref-based to avoid re-renders on fast mouse movements
  const hoveredDancerRef = useRef<ProtoId | null>(null);
  const lastFrameRef = useRef<WorldState | null>(null);

  // Relationship highlight: ref-based to avoid re-renders on fast mouse movements
  const highlightedRelRef = useRef<CalledIdentifier | null>(null);
  const highlightRelRafRef = useRef(0);

  // Dancer highlight from snazzy errors: ref-based to avoid re-renders
  const highlightedDancerRef = useRef<ProtoId | null>(null);
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
        const N = 10;
        const dur = animation.dur;
        const frames: WorldState[] = [];
        let lastSampleError: string | null = null;
        for (let i = 0; i < N; i++) {
          const sampleT = t + smoothness * (i / (N - 1) - 0.5);
          try {
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
              frames.push(
                shiftFrameByProgression(rawFrame, -wraps * inferredProgression),
              );
            } else {
              const clampedT = Math.max(0, Math.min(dur, sampleT));
              frames.push(animation.getFrame(clampedT));
            }
          } catch (e) {
            lastSampleError = e instanceof Error ? e.message : String(e);
          }
        }
        if (frames.length > 0) {
          frame = averageFrames(frames);
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
      frame = shiftFrameByProgression(frame, nProgressionsRef.current);
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
        renderer.drawDancerHighlight(frame[highlightedDancer]);
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
  }, [animation, inferredProgression, previewFrames, smoothness]);

  // Keep drawRef in sync so stable callbacks can always call the latest draw
  useEffect(() => {
    drawRef.current = draw;
  });

  // Debug hook for browser automation testing
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- temporary debug hook
    (window as any).__debug = {
      scrub: (beat: number) => {
        beatRef.current = beat;
        nProgressionsRef.current = 0;
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
        drawRef.current();
      },
    };
  });

  useEffect(() => {
    nProgressionsRef.current = 0;
    drawRef.current();
  }, [animation, smoothness]);

  const setHighlightedRelationship = useCallback(
    (cid: CalledIdentifier | null) => {
      highlightedRelRef.current = cid;
      cancelAnimationFrame(highlightRelRafRef.current);
      highlightRelRafRef.current = requestAnimationFrame(() =>
        drawRef.current(),
      );
    },
    [],
  );

  const setHighlightedDancer = useCallback((id: ProtoId | null) => {
    highlightedDancerRef.current = id;
    cancelAnimationFrame(highlightDancerRafRef.current);
    highlightDancerRafRef.current = requestAnimationFrame(() =>
      drawRef.current(),
    );
  }, []);

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

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Uint8Array.buffer is ArrayBuffer at runtime but typed as ArrayBufferLike
      const blob = new Blob([gifBytes.buffer as ArrayBuffer], {
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
  }, [animation, previewFrames]);

  // Initialize renderer + ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const applySize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w;
      canvas.height = h;
      if (!rendererRef.current) {
        rendererRef.current = new Renderer(ctx, w, h);
      } else {
        rendererRef.current.resize(w, h);
      }
      drawRef.current();
    };

    applySize();

    let hoverRaf = 0;
    const onMouseMove = (e: MouseEvent) => {
      const renderer = rendererRef.current;
      const frame = lastFrameRef.current;
      if (!renderer || !frame) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hit = renderer.hitTestDancer(x, y, frame);
      if (hit !== hoveredDancerRef.current) {
        hoveredDancerRef.current = hit;
        cancelAnimationFrame(hoverRaf);
        hoverRaf = requestAnimationFrame(() => drawRef.current());
      }
    };
    const onMouseLeave = () => {
      if (hoveredDancerRef.current !== null) {
        hoveredDancerRef.current = null;
        cancelAnimationFrame(hoverRaf);
        hoverRaf = requestAnimationFrame(() => drawRef.current());
      }
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    let resizeRaf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(applySize);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeRaf);
      cancelAnimationFrame(hoverRaf);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

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
      nProgressionsRef.current = 0;
      rendererRef.current?.clearTrails();
      drawRef.current();
    },
    [DANCE_LENGTH],
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
      const startBeat = findInstructionStartBeat(instructions, id);
      if (startBeat !== null) {
        beatRef.current = startBeat;
        nProgressionsRef.current = 0;
        rendererRef.current?.clearTrails();
        drawRef.current();
      }
    },
    [instructions],
  );

  const handleSkipToInstruction = useCallback(
    (id: InstructionId) => {
      const startBeat = findInstructionStartBeat(instructions, id);
      if (startBeat !== null) {
        beatRef.current = startBeat;
        nProgressionsRef.current = 0;
        rendererRef.current?.clearTrails();
        drawRef.current();
      }
    },
    [instructions],
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
        {nProgressionsRef.current !== 0 && (
          <div className="beat-display">Prog {nProgressionsRef.current}</div>
        )}
      </div>
      <div className="controls">
        <span className="speed-display">{bpm} BPM</span>
        <input
          type="range"
          min={60}
          max={120}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
        />
      </div>
      <div className="controls">
        <span className="speed-display">Smooth {smoothness.toFixed(1)}</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={smoothness}
          onChange={(e) => setSmoothness(Number(e.target.value))}
        />
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
      <div className="legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#4a90d9" }} /> Lark
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: "#d94a4a" }} />{" "}
          Robin
        </div>
        <div className="legend-item">
          <span style={{ color: "#7a7" }}>{"\u25B2"}</span> Up
        </div>
        <div className="legend-item">
          <span style={{ color: "#a77" }}>{"\u25BC"}</span> Down
        </div>
      </div>
    </>
  );

  const undoContextValue = useMemo(
    () => ({ beginTransient, endTransient, undo, redo, canUndo, canRedo }),
    [beginTransient, endTransient, undo, redo, canUndo, canRedo],
  );

  const commandPaneProps = {
    instructions,
    setInstructions,
    initFormation,
    setInitFormation,
    setDanceState,
    activeId: activeInstructionId(instructions, beat),
    generateErrors,
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
            {localStorageError && (
              <div className="localstorage-error">
                <strong>Could not load saved dance from localStorage:</strong>
                <pre>{localStorageError}</pre>
                <button onClick={() => setLocalStorageError(null)}>
                  Dismiss
                </button>
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
                <span className="speed-display">{bpm} BPM</span>
                <input
                  type="range"
                  min={60}
                  max={120}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                />
              </div>
              <div className="controls">
                <span className="speed-display">
                  Smooth {smoothness.toFixed(1)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={smoothness}
                  onChange={(e) => setSmoothness(Number(e.target.value))}
                />
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
