import { produce } from "immer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vector } from "vecti";

import { Renderer } from "./components/Renderer";
import {
  ALL_PROTO_IDS,
  ALL_PROTO_IDS_SET,
  type ProtoId,
  type Role,
  RoleSchema,
} from "./contraCore";
import { ccwRadsBetween, lerpFacing as lerpFacingVec, NORTH } from "./geometry";
import {
  type CalledIdentifier,
  CalledIdentifierSchema,
  type ContraAnimation,
} from "./instructions/_base";
import { animateSegments, type Segment } from "./instructions/_segment";
import { resolveInitFormation } from "./instructions/index";
import type { LRInstructionTemplate } from "./instructions/templatedLRInstruction";
import { LRInstructionTemplateSchema } from "./instructions/templatedLRInstruction";
import { lerpVectors } from "./utils";
import { Dancer, type WorldState, WorldStateSchema } from "./worldState";

// ── Types ────────────────────────────────────────────────────────────────

type Mode = "init" | "keyframe" | "preview";

type KeyframeEntry = {
  t: number;
  states: Partial<Record<Role, { relPos: Vector; relFacing: number }>>;
};

type MatcherConfig =
  | { type: "hardcoded"; cid: CalledIdentifier }
  | { type: "choreographer_specified" };

type DragState = {
  startWorldX: number;
  startWorldY: number;
  currentWorldX: number;
  currentWorldY: number;
  /** In init mode, which dancer we're dragging */
  dancerId?: ProtoId;
  /** Whether shift was held at drag start (init mode: change facing) */
  shiftKey: boolean;
};

// ── Coordinate helpers ───────────────────────────────────────────────────

function worldToRel(
  worldPos: Vector,
  origPos: Vector,
  origFacing: Vector,
): Vector {
  const angle = ccwRadsBetween(NORTH, origFacing);
  return worldPos.subtract(origPos).rotateByRadians(-angle);
}

function facingToRel(worldFacing: Vector, origFacing: Vector): number {
  return ccwRadsBetween(origFacing, worldFacing);
}

function relToWorld(
  relPos: Vector,
  origPos: Vector,
  origFacing: Vector,
): Vector {
  const angle = ccwRadsBetween(NORTH, origFacing);
  return origPos.add(relPos.rotateByRadians(angle));
}

function relFacingToWorld(relFacing: number, origFacing: Vector): Vector {
  return origFacing.rotateByRadians(relFacing);
}

// ── Component ────────────────────────────────────────────────────────────

export default function InstructionDefinitionTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  // Template state
  const [name, setName] = useState("untitled");
  const [defaultBeats, setDefaultBeats] = useState(8);
  const [matcher, setMatcher] = useState<MatcherConfig>({
    type: "choreographer_specified",
  });
  const [fieldsDisplay, setFieldsDisplay] = useState<
    LRInstructionTemplate["fieldsDisplay"]
  >([]);
  const [initState, setInitState] = useState<WorldState>(() =>
    resolveInitFormation("improper"),
  );
  const [keyframes, setKeyframes] = useState<KeyframeEntry[]>([]);

  // UI state
  const [mode, setMode] = useState<Mode>("init");
  const [selectedDancer, setSelectedDancer] = useState<ProtoId | null>(null);
  const [keyframeDuration, setKeyframeDuration] = useState(1);
  // Tracks which keyframe slot the next click will fill for the current role
  const [nextSlotForRole, setNextSlotForRole] = useState(0);
  const [previewBeat, setPreviewBeat] = useState(0);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [fieldsDisplayText, setFieldsDisplayText] = useState("");

  // Refs for animation-frame drawing (avoid re-render thrash during drag)
  const dragRef = useRef<DragState | null>(null);
  const drawRafRef = useRef(0);

  const selectedRole: Role | null = useMemo(() => {
    if (!selectedDancer) return null;
    return Dancer.get(selectedDancer, initState).role;
  }, [selectedDancer, initState]);

  // ── Preview animation ───────────────────────────────────────────────

  const previewAnimation = useMemo((): ContraAnimation | null => {
    if (keyframes.length === 0) return null;

    const lastKfT = keyframes[keyframes.length - 1].t;
    const scale = lastKfT > 0 ? defaultBeats / lastKfT : 1;

    try {
      const segments: Segment[] = [];
      let prevT = 0;

      for (const kf of keyframes) {
        const scaledT = kf.t * scale;
        const dur = scaledT - prevT;

        segments.push({
          dur,
          position: (dancer, frac) => {
            const state = kf.states[dancer.role];
            if (!state) return dancer.pos;
            const orig = dancer.at(initState);
            const worldTarget = relToWorld(state.relPos, orig.pos, orig.facing);
            return lerpVectors(dancer.pos, worldTarget, frac);
          },
          facing: (dancer, frac) => {
            const state = kf.states[dancer.role];
            if (!state) return dancer.facing;
            const orig = dancer.at(initState);
            const worldFacing = relFacingToWorld(state.relFacing, orig.facing);
            return lerpFacingVec(dancer.facing, worldFacing, frac);
          },
        });

        prevT = scaledT;
      }

      return animateSegments(initState, ALL_PROTO_IDS_SET, segments);
    } catch {
      // SWALLOW_EXCEPTION: template may be in an invalid intermediate state while editing
      return null;
    }
  }, [keyframes, defaultBeats, initState]);

  // ── Drawing ──────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (mode === "preview" && previewAnimation) {
      const t = Math.min(previewBeat, previewAnimation.dur);
      renderer.drawFrame(t, previewAnimation.getFrame(t));
      return;
    }

    // Draw the base frame (this draws grid + all dancers)
    renderer.drawFrame(0, initState);

    // Highlight selected dancer
    if (selectedDancer && mode === "keyframe") {
      renderer.drawDancerHighlight(Dancer.get(selectedDancer, initState));
    }

    // Draw ghost dancers at keyframe positions
    if (selectedDancer && mode === "keyframe" && selectedRole) {
      const orig = Dancer.get(selectedDancer, initState);
      for (const kf of keyframes) {
        const roleState = kf.states[selectedRole];
        if (!roleState) continue;
        const worldPos = relToWorld(roleState.relPos, orig.pos, orig.facing);
        const worldFacing = relFacingToWorld(roleState.relFacing, orig.facing);
        renderer.drawGhostDancer(
          selectedDancer,
          worldPos.x,
          worldPos.y,
          worldFacing,
          0.3,
        );
      }

      // Draw ghost during drag (only if actually dragging, not just clicking)
      const drag = dragRef.current;
      const dragDist = drag
        ? Math.hypot(
            drag.currentWorldX - drag.startWorldX,
            drag.currentWorldY - drag.startWorldY,
          )
        : 0;
      if (drag && dragDist >= 0.02) {
        const dragPos = new Vector(drag.startWorldX, drag.startWorldY);
        const dragDir = new Vector(
          drag.currentWorldX - drag.startWorldX,
          drag.currentWorldY - drag.startWorldY,
        );
        const dragFacing =
          dragDir.length() > 0.01 ? dragDir.normalize() : orig.facing;
        renderer.drawGhostDancer(
          selectedDancer,
          dragPos.x,
          dragPos.y,
          dragFacing,
          0.5,
        );
      }
    }
  }, [
    initState,
    selectedDancer,
    selectedRole,
    mode,
    keyframes,
    previewAnimation,
    previewBeat,
  ]);

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(drawRafRef.current);
    drawRafRef.current = requestAnimationFrame(() => draw());
  }, [draw]);

  // ── Canvas setup ─────────────────────────────────────────────────────

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
      requestDraw();
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
  }, [requestDraw]);

  // Redraw when state changes
  useEffect(() => {
    requestDraw();
  }, [requestDraw]);

  // ── Mouse interaction ────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;
      if (!renderer || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const [wx, wy] = renderer.canvasToWorld(cx, cy);

      if (mode === "init") {
        // Hit test: which dancer did we click on?
        const hit = renderer.hitTestDancer(cx, cy, initState);
        if (hit) {
          const drag: DragState = {
            startWorldX: wx,
            startWorldY: wy,
            currentWorldX: wx,
            currentWorldY: wy,
            dancerId: hit,
            shiftKey: e.shiftKey,
          };
          dragRef.current = drag;
        }
      } else if (mode === "keyframe") {
        const drag: DragState = {
          startWorldX: wx,
          startWorldY: wy,
          currentWorldX: wx,
          currentWorldY: wy,
          shiftKey: e.shiftKey,
        };
        dragRef.current = drag;
      }
    },
    [mode, initState],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const renderer = rendererRef.current;
      const canvas = canvasRef.current;
      if (!renderer || !canvas || !dragRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const [wx, wy] = renderer.canvasToWorld(cx, cy);

      dragRef.current = {
        ...dragRef.current,
        currentWorldX: wx,
        currentWorldY: wy,
      };

      if (mode === "init" && dragRef.current.dancerId) {
        const id = dragRef.current.dancerId;
        if (dragRef.current.shiftKey) {
          // Change facing: facing = direction from dancer to mouse
          const dancer = initState[id];
          const dir = new Vector(wx - dancer.pos.x, wy - dancer.pos.y);
          if (dir.length() > 0.01) {
            setInitState(
              produce(initState, (draft) => {
                draft[id].facing = dir.normalize();
              }),
            );
          }
        } else {
          // Move dancer
          setInitState(
            produce(initState, (draft) => {
              draft[id].pos = new Vector(wx, wy);
            }),
          );
        }
      }

      requestDraw();
    },
    [mode, initState, requestDraw],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dragDist = Math.hypot(
        drag.currentWorldX - drag.startWorldX,
        drag.currentWorldY - drag.startWorldY,
      );
      const isClick = dragDist < 0.02;

      if (mode === "keyframe") {
        if (isClick) {
          // Click with no drag = select dancer
          const renderer = rendererRef.current;
          const canvas = canvasRef.current;
          if (renderer && canvas) {
            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const hit = renderer.hitTestDancer(cx, cy, initState);
            if (hit) {
              setSelectedDancer(hit);
              // Reset slot counter: find how many existing keyframes already
              // have data for this dancer's role
              const hitRole = Dancer.get(hit, initState).role;
              const filled = keyframes.filter(
                (kf) => kf.states[hitRole] != null,
              ).length;
              setNextSlotForRole(filled);
            }
          }
        } else if (selectedDancer && selectedRole) {
          // Drag = add keyframe for current role, merged into the next slot
          const orig = Dancer.get(selectedDancer, initState);
          const clickPos = new Vector(drag.startWorldX, drag.startWorldY);
          const dragDir = new Vector(
            drag.currentWorldX - drag.startWorldX,
            drag.currentWorldY - drag.startWorldY,
          );
          const worldFacing =
            dragDir.length() > 0.01 ? dragDir.normalize() : orig.facing;

          const relPos = worldToRel(clickPos, orig.pos, orig.facing);
          const relFacing = facingToRel(worldFacing, orig.facing);

          const slot = nextSlotForRole;

          setKeyframes((prev) => {
            if (slot < prev.length) {
              // Merge into existing keyframe
              return prev.map((kf, i) =>
                i === slot
                  ? {
                      ...kf,
                      states: {
                        ...kf.states,
                        [selectedRole]: { relPos, relFacing },
                      },
                    }
                  : kf,
              );
            } else {
              // Append new keyframe slot
              const lastT = prev.length > 0 ? prev[prev.length - 1].t : 0;
              return [
                ...prev,
                {
                  t: lastT + keyframeDuration,
                  states: {
                    [selectedRole]: { relPos, relFacing },
                  },
                },
              ];
            }
          });
          setNextSlotForRole(slot + 1);
        }
      }

      dragRef.current = null;
      requestDraw();
    },
    [
      mode,
      selectedDancer,
      selectedRole,
      initState,
      keyframes,
      keyframeDuration,
      nextSlotForRole,
      requestDraw,
    ],
  );

  // ── Export / Import ──────────────────────────────────────────────────

  const exportTemplate = useCallback((): LRInstructionTemplate => {
    return {
      name,
      defaultBeats,
      matcher,
      fieldsDisplay,
      keyframes: keyframes.map((kf) => ({
        t: kf.t,
        states: Object.fromEntries(
          RoleSchema.options
            .filter((r) => kf.states[r] != null)
            .map((r) => [r, kf.states[r]!]),
        ) as Record<Role, { relPos: Vector; relFacing: number }>,
      })),
    };
  }, [name, defaultBeats, matcher, fieldsDisplay, keyframes]);

  const exportTypeScript = useCallback(() => {
    const template = exportTemplate();
    const jsonBody = JSON.stringify(
      template,
      (_key, value) => {
        if (value instanceof Vector) {
          return { x: value.x, y: value.y };
        }
        return value as unknown;
      },
      2,
    );
    return [
      `import { typedParse } from "../../utils";`,
      `import { LRInstructionTemplateSchema } from "../templatedLRInstruction";`,
      ``,
      `export default typedParse(LRInstructionTemplateSchema, ${jsonBody});`,
      ``,
    ].join("\n");
  }, [exportTemplate]);

  const handleImportJson = useCallback((text: string) => {
    setJsonError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setJsonError(
        `Invalid JSON: ${e instanceof SyntaxError ? e.message : String(e)}`,
      );
      return;
    }

    const result = LRInstructionTemplateSchema.safeParse(parsed);
    if (!result.success) {
      setJsonError(
        result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      );
      return;
    }

    const template = result.data;
    setName(template.name);
    setDefaultBeats(template.defaultBeats);
    setMatcher(template.matcher);
    setFieldsDisplay(template.fieldsDisplay);
    setKeyframes(
      template.keyframes.map((kf) => ({
        t: kf.t,
        states: kf.states,
      })),
    );
  }, []);

  const handlePasteInitState = useCallback((text: string) => {
    setJsonError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setJsonError(
        `Invalid JSON: ${e instanceof SyntaxError ? e.message : String(e)}`,
      );
      return;
    }

    const result = WorldStateSchema.safeParse(parsed);
    if (!result.success) {
      setJsonError(
        result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      );
      return;
    }
    setInitState(result.data);
  }, []);

  // ── fieldsDisplay parsing ────────────────────────────────────────────

  const handleFieldsDisplayChange = useCallback((text: string) => {
    setFieldsDisplayText(text);
    // Parse: text segments separated by {matcher}
    const parts = text.split(/\{matcher\}/g);
    const result: LRInstructionTemplate["fieldsDisplay"] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) result.push(parts[i]);
      if (i < parts.length - 1) result.push({ field: "matcher" });
    }
    setFieldsDisplay(result);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────

  const matcherCidOptions = CalledIdentifierSchema.options;

  return (
    <div className="def-instr-layout">
      <div className="def-instr-canvas-column">
        <div className="canvas-container" ref={canvasContainerRef}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      <div className="def-instr-controls-column">
        <h2>Instruction Definition Tool</h2>

        {/* Mode selector */}
        <div className="def-instr-section">
          <label>Mode: </label>
          <button
            className={mode === "init" ? "active" : ""}
            onClick={() => setMode("init")}
          >
            Initial State
          </button>
          <button
            className={mode === "keyframe" ? "active" : ""}
            onClick={() => setMode("keyframe")}
          >
            Keyframes
          </button>
          <button
            className={mode === "preview" ? "active" : ""}
            onClick={() => {
              setPreviewBeat(0);
              setMode("preview");
            }}
            disabled={!previewAnimation}
          >
            Preview
          </button>
        </div>

        {/* Template metadata */}
        <div className="def-instr-section">
          <h3>Template</h3>
          <label>
            Name:{" "}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="def-instr-text-input"
            />
          </label>
          <label>
            Default beats:{" "}
            <input
              type="number"
              value={defaultBeats}
              onChange={(e) => setDefaultBeats(Number(e.target.value))}
              className="def-instr-number-input"
              min={1}
            />
          </label>
        </div>

        {/* Matcher */}
        <div className="def-instr-section">
          <h3>Matcher</h3>
          <select
            value={matcher.type}
            onChange={(e) => {
              if (e.target.value === "hardcoded") {
                setMatcher({ type: "hardcoded", cid: "partner" });
              } else {
                setMatcher({ type: "choreographer_specified" });
              }
            }}
          >
            <option value="choreographer_specified">
              Choreographer specified
            </option>
            <option value="hardcoded">Hardcoded</option>
          </select>
          {matcher.type === "hardcoded" && (
            <select
              value={matcher.cid}
              onChange={(e) =>
                setMatcher({
                  type: "hardcoded",
                  cid: e.target.value as CalledIdentifier,
                })
              }
            >
              {matcherCidOptions.map((cid) => (
                <option key={cid} value={cid}>
                  {cid}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Fields display */}
        <div className="def-instr-section">
          <h3>Fields Display</h3>
          <input
            type="text"
            value={fieldsDisplayText}
            onChange={(e) => handleFieldsDisplayChange(e.target.value)}
            placeholder='e.g. "chain to your {matcher}"'
            className="def-instr-text-input wide"
          />
          <div className="def-instr-hint">Use {"{matcher}"} as placeholder</div>
        </div>

        {/* Init state controls */}
        {mode === "init" && (
          <div className="def-instr-section">
            <h3>Initial State</h3>
            <p className="def-instr-hint">
              Click and drag dancers to move them. Shift+drag to change facing.
            </p>
            <label>
              Formation preset:{" "}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setInitState(
                      resolveInitFormation(
                        e.target.value as
                          | "improper"
                          | "becket"
                          | "becket_ccw"
                          | "proper",
                      ),
                    );
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose...
                </option>
                <option value="improper">Improper</option>
                <option value="becket">Becket</option>
                <option value="becket_ccw">Becket CCW</option>
                <option value="proper">Proper</option>
              </select>
            </label>
            <div className="def-instr-paste">
              <label>Paste WorldState JSON:</label>
              <input
                type="text"
                placeholder="Paste JSON here"
                className="def-instr-text-input wide"
                onPaste={(e) => {
                  e.preventDefault();
                  handlePasteInitState(e.clipboardData.getData("text"));
                }}
              />
            </div>
          </div>
        )}

        {/* Keyframe controls */}
        {mode === "keyframe" && (
          <div className="def-instr-section">
            <h3>Keyframes</h3>
            <div className="def-instr-dancer-select">
              <label>Dancer: </label>
              {ALL_PROTO_IDS.map((id) => (
                <button
                  key={id}
                  className={selectedDancer === id ? "active" : ""}
                  onClick={() => {
                    setSelectedDancer(id);
                    const role = Dancer.get(id, initState).role;
                    const filled = keyframes.filter(
                      (kf) => kf.states[role] != null,
                    ).length;
                    setNextSlotForRole(filled);
                  }}
                >
                  {id.replace(/_0$/, "").replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <label>
              Keyframe duration:{" "}
              <input
                type="number"
                value={keyframeDuration}
                onChange={(e) => setKeyframeDuration(Number(e.target.value))}
                className="def-instr-number-input"
                min={0.25}
                step={0.25}
              />
            </label>
            {selectedDancer && (
              <p className="def-instr-hint">
                Click and drag on the canvas to add a keyframe. Position = click
                start, facing = drag direction.
              </p>
            )}
            {!selectedDancer && (
              <p className="def-instr-hint">Select a dancer to begin.</p>
            )}

            {/* Keyframe list */}
            {keyframes.length > 0 && (
              <div className="def-instr-keyframe-list">
                <h4>Keyframes ({keyframes.length})</h4>
                {keyframes.map((kf, i) => (
                  <div key={i} className="def-instr-keyframe-item">
                    <span>
                      t={kf.t.toFixed(1)}
                      {Object.entries(kf.states).map(([role, state]) =>
                        state ? (
                          <span key={role} className="def-instr-kf-role">
                            {" "}
                            {role}: ({state.relPos.x.toFixed(2)},{" "}
                            {state.relPos.y.toFixed(2)}) f=
                            {((state.relFacing * 180) / Math.PI).toFixed(0)}deg
                          </span>
                        ) : null,
                      )}
                    </span>
                    <button
                      className="delete-btn"
                      onClick={() =>
                        setKeyframes((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      x
                    </button>
                  </div>
                ))}
                <button onClick={() => setKeyframes([])}>Clear all</button>
              </div>
            )}
          </div>
        )}

        {/* Preview controls */}
        {mode === "preview" && previewAnimation && (
          <div className="def-instr-section">
            <h3>Preview</h3>
            <label>
              Beat: {previewBeat.toFixed(2)} / {previewAnimation.dur.toFixed(2)}
            </label>
            <input
              type="range"
              min={0}
              max={previewAnimation.dur}
              step={0.05}
              value={previewBeat}
              onChange={(e) => setPreviewBeat(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        )}
        {mode === "preview" && !previewAnimation && (
          <div className="def-instr-section">
            <h3>Preview</h3>
            <p className="def-instr-hint">
              No keyframes defined. Add keyframes first.
            </p>
          </div>
        )}

        {/* Export / Import */}
        <div className="def-instr-section">
          <h3>Export / Import</h3>
          <div className="json-io">
            <textarea readOnly rows={8} value={exportTypeScript()} />
            <button
              onClick={() => {
                void navigator.clipboard.writeText(exportTypeScript());
              }}
            >
              Copy to clipboard
            </button>
          </div>
          <div className="json-io" style={{ marginTop: 8 }}>
            <label>Import template JSON:</label>
            <input
              type="text"
              placeholder="Paste template JSON here"
              className="def-instr-text-input wide"
              onPaste={(e) => {
                e.preventDefault();
                handleImportJson(e.clipboardData.getData("text"));
              }}
            />
          </div>
          {jsonError && <div className="paste-error">{jsonError}</div>}
        </div>
      </div>
    </div>
  );
}
