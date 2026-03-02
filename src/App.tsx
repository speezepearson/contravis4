import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Renderer } from "./components/Renderer";
import {
  generateDanceAnimation,
  findInstructionStartBeat,
  splitLists,
} from "./generate";
import CommandPane from "./components/CommandPane";
import type { Instruction, InitFormation, InstructionId } from "./instructions/index";
import {
  InstructionSchema,
  DanceSchema,
  instructionDuration,
  danceLength,
  initFormationStates,
} from "./instructions/index";
import {
  ALL_PROTO_IDS,
  BaseRelationshipSchema,
  resolveRelationship,
} from "./contraCore";
import { decodeRelationship } from "./components/fieldUtils";
import { RelationshipHighlightContext } from "./components/RelationshipHighlightContext";
import { getDancerState } from "./worldState";
import type { Dance } from "./instructions/index";
import { formatDanceParseError } from "./generate";

const LOCALSTORAGE_KEY = "contravis4-dance";

function loadDanceFromLocalStorage(): { dance: Dance } | { error: string } | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LOCALSTORAGE_KEY);
  } catch {
    // SWALLOW_EXCEPTION: localStorage may be unavailable in private browsing
    return null;
  }
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
  const [bpm, setBpm] = useState(120);
  const [beat, setBeat] = useState(0);
  const [instructions, setInstructions] = useState<Instruction[]>(
    () =>
      initialLoadResult && "dance" in initialLoadResult
        ? initialLoadResult.dance.instructions
        : [],
  );
  const [initFormation, setInitFormation] = useState<InitFormation>(
    () =>
      initialLoadResult && "dance" in initialLoadResult
        ? initialLoadResult.dance.initFormation
        : "improper",
  );
  const [progression, setProgression] = useState(
    () =>
      initialLoadResult && "dance" in initialLoadResult
        ? initialLoadResult.dance.progression
        : 1,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Persist dance to localStorage whenever it changes
  useEffect(() => {
    try {
      const dance = { initFormation, progression, instructions };
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(dance));
    } catch {
      // SWALLOW_EXCEPTION: quota exceeded or private browsing - silently ignore
    }
  }, [instructions, initFormation, progression]);

  const [hoveredInstructionId, setHoveredInstructionId] =
    useState<InstructionId | null>(null);

  const { animation, error: generateError } = useMemo(
    () => generateDanceAnimation(instructions, initFormation),
    [instructions, initFormation],
  );
  const DANCE_LENGTH = useMemo(
    () => danceLength(instructions),
    [instructions],
  );

  // Compute preview frames when hovering over an instruction
  const previewFrames = useMemo(() => {
    if (!hoveredInstructionId || !animation) return [];
    const instr = findInstructionById(instructions, hoveredInstructionId);
    if (!instr) return [];
    const startBeat =
      findInstructionStartBeat(instructions, hoveredInstructionId) ?? 0;
    const dur = instructionDuration(instr);
    if (dur <= 0) return [];

    // Sample the animation at regular intervals during this instruction
    const SAMPLE_COUNT = 12;
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
  const highlightedRelRef = useRef<string | null>(null);
  const highlightRelRafRef = useRef(0);

  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer || !animation) return;

    let t = beatRef.current;
    if (t > animation.dur) t = animation.dur;
    if (t < 0) t = 0;

    try {
      const frame = animation.getFrame(t);
      renderer.drawFrame(frame, -progression / DANCE_LENGTH);

      // Draw relationship highlight lines
      const highlightedRel = highlightedRelRef.current;
      if (highlightedRel) {
        const decoded = decodeRelationship(highlightedRel);
        const base = BaseRelationshipSchema.safeParse(decoded.base);
        if (base.success) {
          const rel = { base: base.data, offset: decoded.offset };
          const lines: Array<{
            fromX: number;
            fromY: number;
            toX: number;
            toY: number;
          }> = [];
          for (const id of ALL_PROTO_IDS) {
            const targetId = resolveRelationship(id, rel);
            const from = frame.protos[id];
            const to = getDancerState(targetId, frame.protos);
            lines.push({
              fromX: from.pos.x,
              fromY: from.pos.y,
              toX: to.pos.x,
              toY: to.pos.y,
            });
          }
          renderer.drawRelationshipLines(lines);
        }
      }
    } catch {
      // SWALLOW_EXCEPTION: animation may fail for out-of-range beats; just draw nothing extra
      // Render just the init formation as fallback
      const initState = initFormationStates[initFormation];
      renderer.drawFrame(initState, 0);
    }

    // Draw preview keyframes overlay
    if (previewFrames.length > 0) {
      renderer.drawPreviewKeyframes(previewFrames);
    }
    setBeat(beatRef.current);
  }, [animation, DANCE_LENGTH, progression, previewFrames, initFormation]);

  // Keep drawRef in sync so stable callbacks can always call the latest draw
  useEffect(() => {
    drawRef.current = draw;
  });

  const setHighlightedRelationship = useCallback(
    (encoded: string | null) => {
      highlightedRelRef.current = encoded;
      cancelAnimationFrame(highlightRelRafRef.current);
      highlightRelRafRef.current = requestAnimationFrame(() =>
        drawRef.current(),
      );
    },
    [],
  );

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

    let resizeRaf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(applySize);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeRaf);
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
        beatRef.current = 0;
        rendererRef.current?.clearTrails();
      }

      drawRef.current();
      rafRef.current = requestAnimationFrame((ts) =>
        animateRef.current!(ts),
      );
    };
  });

  // Start/stop animation loop
  useEffect(() => {
    if (playing) {
      lastTimestampRef.current = null;
      rafRef.current = requestAnimationFrame((ts) =>
        animateRef.current!(ts),
      );
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const stepFwd = useCallback(() => {
    beatRef.current = Math.min(beatRef.current + 0.25, DANCE_LENGTH);
    drawRef.current();
  }, [DANCE_LENGTH]);

  const stepBack = useCallback(() => {
    beatRef.current = Math.max(beatRef.current - 0.25, 0);
    drawRef.current();
  }, []);

  const scrub = useCallback(
    (val: number) => {
      const pct = val / 1000;
      beatRef.current = pct * DANCE_LENGTH;
      rendererRef.current?.clearTrails();
      drawRef.current();
    },
    [DANCE_LENGTH],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag =
        e.target instanceof HTMLElement ? e.target.tagName : undefined;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA")
        return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        stepFwd();
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        stepBack();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [togglePlay, stepFwd, stepBack]);

  const handleHoverInstruction = useCallback(
    (id: InstructionId | null) => {
      setHoveredInstructionId(id);
    },
    [],
  );

  const handleEditInstruction = useCallback(
    (id: InstructionId) => {
      const startBeat = findInstructionStartBeat(instructions, id);
      if (startBeat !== null) {
        beatRef.current = startBeat;
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
        <button onClick={stepBack}>{"\u25C0 Step"}</button>
        <button onClick={stepFwd}>{"Step \u25B6"}</button>
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
      <div className="legend">
        <div className="legend-item">
          <span
            className="legend-dot"
            style={{ background: "#4a90d9" }}
          />{" "}
          Lark
        </div>
        <div className="legend-item">
          <span
            className="legend-dot"
            style={{ background: "#d94a4a" }}
          />{" "}
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

  const commandPaneProps = {
    instructions,
    setInstructions,
    initFormation,
    setInitFormation,
    progression,
    setProgression,
    activeId: activeInstructionId(instructions, beat),
    generateError,
    animation,
    onHoverInstruction: handleHoverInstruction,
    onEditInstruction: handleEditInstruction,
    onSkipToInstruction: handleSkipToInstruction,
  };

  return (
    <RelationshipHighlightContext.Provider
      value={setHighlightedRelationship}
    >
      <div className="app-layout">
        {localStorageError && (
          <div className="localstorage-error">
            <strong>
              Could not load saved dance from localStorage:
            </strong>
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
          <div className="sidebar-controls">
            {desktopControlsBlock}
          </div>
        </div>

        {/* Mobile: compact controls bar */}
        <div className="mobile-controls">
          <div className="controls">
            <button onClick={togglePlay}>
              {playing ? "\u23F8 Pause" : "\u25B6 Play"}
            </button>
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
    </RelationshipHighlightContext.Provider>
  );
}
