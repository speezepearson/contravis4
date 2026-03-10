import { produce } from "immer";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Vector } from "vecti";

import { Renderer } from "./components/Renderer";
import { SearchableDropdown } from "./components/SearchableDropdown";
import {
  ALL_PROTO_IDS,
  ALL_PROTO_IDS_SET,
  type ProtoId,
  ProtoIdSchema,
  type Role,
  RoleSchema,
} from "./contraCore";
import { lerpFacing as lerpFacingVec } from "./geometry";
import {
  CalledDirectionSchema,
  CalledIdentifierSchema,
  type ContraAnimation,
} from "./instructions/_base";
import { animateSegments, type Segment } from "./instructions/_segment";
import {
  InitFormationNameSchema,
  resolveInitFormation,
} from "./instructions/index";
import {
  type BasisSpec,
  BasisSpecSchema,
  type BasisVectorSpec,
  BasisVectorSpecSchema,
  DEFAULT_TEMPLATE_BASIS,
  type LLRRInstructionTemplate,
  LLRRInstructionTemplateSchema,
  type LRInstructionTemplate,
  LRInstructionTemplateSchema,
  type TemplateBasis,
} from "./instructions/templates/_base";
import {
  facingToRelWithBasis,
  relFacingToWorldWithBasis,
  relPosToWorldWithBasis,
  resolveBasisVector,
  resolveTemplateBasisAtInit,
  worldToRelWithBasis,
} from "./instructions/templates/_basisResolution";
import {
  allLLRRTemplates,
  allLRTemplates,
  LLRRTemplateIdSchema,
  LRTemplateIdSchema,
} from "./instructions/templates/index";
import { useUndoRedo } from "./useUndoRedo";
import { buildEnumRecord, lerpVectors } from "./utils";
import { Dancer, type WorldState, WorldStateSchema } from "./worldState";

// ── Types ────────────────────────────────────────────────────────────────

type TemplateType = "lr" | "llrr";

/** In LR mode the key is a Role; in LLRR mode it's a ProtoId. */
type StateKey = Role | ProtoId;

type KeyframeEntry = {
  t: number;
  states: Partial<Record<StateKey, { relPos: Vector; relFacing: number }>>;
};

type TemplateState = {
  templateType: TemplateType;
  name: string;
  defaultBeats: number;
  basis: TemplateBasis;
  fieldsDisplay: LRInstructionTemplate["fieldsDisplay"];
  initState: WorldState;
  keyframes: KeyframeEntry[];
};

const INITIAL_TEMPLATE_STATE: TemplateState = {
  templateType: "lr",
  name: "untitled",
  defaultBeats: 8,
  basis: { ...DEFAULT_TEMPLATE_BASIS },
  fieldsDisplay: [],
  initState: resolveInitFormation("improper"),
  keyframes: [],
};

type DragState = {
  startWorldX: number;
  startWorldY: number;
  currentWorldX: number;
  currentWorldY: number;
  /** In init mode, which dancer we're dragging */
  dancerId?: ProtoId;
  /** Whether shift was held at drag start (init/keyframe: change facing) */
  shiftKey: boolean;
  /** In keyframe mode, index of the ghost keyframe being dragged (if any) */
  ghostKeyframeIndex?: number;
};

// ── Basis helpers ────────────────────────────────────────────────────────

function resolvedBasisForDancer(
  basis: TemplateBasis,
  dancerId: ProtoId,
  initState: WorldState,
): { xBasis: Vector; yBasis: Vector } {
  try {
    return resolveTemplateBasisAtInit(basis, dancerId, initState);
  } catch {
    // SWALLOW_EXCEPTION: basis may reference identifiers that can't be resolved
    // in the current init state; fall back to the default facing-based basis.
    return resolveTemplateBasisAtInit(
      DEFAULT_TEMPLATE_BASIS,
      dancerId,
      initState,
    );
  }
}

// ── Basis dropdown label helper ──────────────────────────────────────────

function basisSpecToText(spec: BasisSpec): string {
  return spec.replace(/_/g, " ");
}

// ── Component ────────────────────────────────────────────────────────────

export default function InstructionDefinitionTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  // Template state (undoable)
  const {
    state: tpl,
    setState: setTpl,
    beginTransient,
    endTransient,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<TemplateState>(INITIAL_TEMPLATE_STATE);

  const {
    templateType,
    name,
    defaultBeats,
    basis,
    fieldsDisplay,
    initState,
    keyframes,
  } = tpl;

  // Convenience updaters
  const updateTpl = useCallback(
    (patch: Partial<TemplateState>) => setTpl({ ...tpl, ...patch }),
    [tpl, setTpl],
  );

  // UI state
  const [selectedDancer, setSelectedDancer] = useState<ProtoId | null>(null);
  const [keyframeDuration, setKeyframeDuration] = useState(1);
  // Tracks which keyframe slot the next click will fill for the current state key
  const [nextSlotForKey, setNextSlotForKey] = useState(0);
  const [previewBeat, setPreviewBeat] = useState(0);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [fieldsDisplayText, setFieldsDisplayText] = useState("");
  const [highlightedBasisSpec, setHighlightedBasisSpec] =
    useState<BasisVectorSpec | null>(null);

  // Refs for animation-frame drawing (avoid re-render thrash during drag)
  const dragRef = useRef<DragState | null>(null);
  const drawRafRef = useRef(0);

  /** The key used for keyframe state lookup — Role for LR, ProtoId for LLRR. */
  const selectedStateKey: StateKey | null = useMemo(() => {
    if (!selectedDancer) return null;
    if (templateType === "llrr") return selectedDancer;
    return Dancer.get(selectedDancer, initState).role;
  }, [selectedDancer, initState, templateType]);

  /** The resolved basis vectors for the selected dancer. */
  const selectedBasis = useMemo((): {
    xBasis: Vector;
    yBasis: Vector;
  } | null => {
    if (!selectedDancer || !selectedStateKey) return null;
    return resolvedBasisForDancer(basis, selectedDancer, initState);
  }, [selectedDancer, selectedStateKey, basis, initState]);

  /** Per-axis basis resolution errors (checked against all dancers). */
  const basisErrors = useMemo((): { x: string | null; y: string | null } => {
    function concreteSpec(
      spec: BasisSpec,
      assumed: BasisVectorSpec | undefined,
    ): BasisVectorSpec | null {
      if (
        spec === "choreographer_specified_direction" ||
        spec === "choreographer_specified_identifier"
      ) {
        return assumed ?? null;
      }
      return BasisVectorSpecSchema.parse(spec);
    }

    function tryAxis(
      spec: BasisSpec,
      assumed: BasisVectorSpec | undefined,
    ): string | null {
      const concrete = concreteSpec(spec, assumed);
      if (!concrete) return "No assumed default provided";
      for (const protoId of ALL_PROTO_IDS) {
        try {
          resolveBasisVector(concrete, Dancer.get(protoId, initState));
        } catch (e) {
          return e instanceof Error ? e.message : String(e);
        }
      }
      return null;
    }

    return {
      x: tryAxis(basis.x, basis.assumedX),
      y: tryAxis(basis.y, basis.assumedY),
    };
  }, [basis, initState]);

  // ── Preview animation ───────────────────────────────────────────────

  const previewAnimation = useMemo((): ContraAnimation | null => {
    if (keyframes.length === 0) return null;

    const lastKfT = keyframes[keyframes.length - 1].t;
    const scale = lastKfT > 0 ? defaultBeats / lastKfT : 1;

    try {
      // Pre-resolve basis for each dancer
      const basisCache = new Map<string, { xBasis: Vector; yBasis: Vector }>();
      const getBasis = (dancer: Dancer) => {
        const key = dancer.protoId;
        let cached = basisCache.get(key);
        if (!cached) {
          cached = resolvedBasisForDancer(basis, dancer.protoId, initState);
          basisCache.set(key, cached);
        }
        return cached;
      };

      const segments: Segment[] = [];
      let prevT = 0;

      for (const kf of keyframes) {
        const scaledT = kf.t * scale;
        const dur = scaledT - prevT;

        segments.push({
          dur,
          position: (dancer, frac) => {
            const key = templateType === "llrr" ? dancer.protoId : dancer.role;
            const state = kf.states[key];
            if (!state) return dancer.pos;
            const orig = dancer.at(initState);
            const { xBasis, yBasis } = getBasis(dancer);
            const worldTarget = relPosToWorldWithBasis(
              state.relPos,
              orig.pos,
              xBasis,
              yBasis,
            );
            return lerpVectors(dancer.pos, worldTarget, frac);
          },
          facing: (dancer, frac) => {
            const key = templateType === "llrr" ? dancer.protoId : dancer.role;
            const state = kf.states[key];
            if (!state) return dancer.facing;
            const { yBasis } = getBasis(dancer);
            const worldFacing = relFacingToWorldWithBasis(
              state.relFacing,
              yBasis,
            );
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
  }, [keyframes, defaultBeats, initState, templateType, basis]);

  // ── Sampled path frames for always-on path lines ───────────────────

  const previewPathFrames = useMemo((): WorldState[] => {
    if (!previewAnimation) return [];
    const steps = Math.max(2, Math.ceil(previewAnimation.dur / 0.25));
    const frames: WorldState[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * previewAnimation.dur;
      frames.push(previewAnimation.getFrame(t));
    }
    return frames;
  }, [previewAnimation]);

  // ── Drawing ──────────────────────────────────────────────────────────

  // Refs mirroring draw-relevant state so `draw` can be stable (no stale
  // closures) and `requestDraw` / canvas-setup never re-trigger.
  const initStateRef = useRef(initState);
  const keyframesRef = useRef(keyframes);
  const selectedDancerRef = useRef<ProtoId | null>(selectedDancer);
  const selectedStateKeyRef = useRef(selectedStateKey);
  const selectedBasisRef = useRef(selectedBasis);
  const previewAnimationRef = useRef(previewAnimation);
  const previewBeatRef = useRef(previewBeat);
  const previewPathFramesRef = useRef(previewPathFrames);
  const highlightedBasisSpecRef = useRef(highlightedBasisSpec);
  const basisRef = useRef(basis);
  useLayoutEffect(() => {
    initStateRef.current = initState;
    keyframesRef.current = keyframes;
    selectedDancerRef.current = selectedDancer;
    selectedStateKeyRef.current = selectedStateKey;
    selectedBasisRef.current = selectedBasis;
    previewAnimationRef.current = previewAnimation;
    previewBeatRef.current = previewBeat;
    previewPathFramesRef.current = previewPathFrames;
    highlightedBasisSpecRef.current = highlightedBasisSpec;
    basisRef.current = basis;
  });

  // Stable draw – reads everything from refs so requestDraw never changes
  // and the canvas-setup effect only runs once.
  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const curInitState = initStateRef.current;
    const curPreviewAnimation = previewAnimationRef.current;
    const curPreviewBeat = previewBeatRef.current;
    const curSelectedDancer = selectedDancerRef.current;
    const curSelectedStateKey = selectedStateKeyRef.current;
    const curBasis = selectedBasisRef.current;
    const curKeyframes = keyframesRef.current;
    const curPathFrames = previewPathFramesRef.current;
    const curHighlightedSpec = highlightedBasisSpecRef.current;

    if (curPreviewAnimation && curPreviewBeat > 0) {
      const t = Math.min(curPreviewBeat, curPreviewAnimation.dur);
      renderer.drawFrame(t, curPreviewAnimation.getFrame(t));
      return;
    }

    // Draw the base frame (this draws grid + all dancers)
    renderer.drawFrame(0, curInitState);

    // Draw path lines (always, when we have keyframes)
    if (curPathFrames.length > 0) {
      renderer.drawPreviewKeyframes(curPathFrames);
    }

    // Highlight selected dancer
    if (curSelectedDancer) {
      renderer.drawDancerHighlight(Dancer.get(curSelectedDancer, curInitState));
    }

    // Draw basis arrows for ALL dancers in init state
    {
      const curBasisTemplate = basisRef.current;
      for (const protoId of ALL_PROTO_IDS) {
        try {
          const resolved = resolvedBasisForDancer(
            curBasisTemplate,
            protoId,
            curInitState,
          );
          const dancer = Dancer.get(protoId, curInitState);
          renderer.drawBasisArrows(
            dancer.pos.x,
            dancer.pos.y,
            resolved.xBasis,
            resolved.yBasis,
          );
        } catch {
          // SWALLOW_EXCEPTION: basis may not be resolvable for this dancer
        }
      }
    }

    // Draw highlighted basis spec as a line from selected dancer
    if (curSelectedDancer && curHighlightedSpec) {
      try {
        const dancer = Dancer.get(curSelectedDancer, curInitState);
        const vec = resolveBasisVector(
          BasisVectorSpecSchema.parse(curHighlightedSpec),
          dancer,
        );
        if (vec.length() > 1e-6) {
          renderer.drawRelationshipLines([
            {
              fromX: dancer.pos.x,
              fromY: dancer.pos.y,
              toX: dancer.pos.x + vec.x,
              toY: dancer.pos.y + vec.y,
            },
          ]);
        }
      } catch {
        // SWALLOW_EXCEPTION: spec may not be resolvable in the current init state
      }
    }

    // Draw ghost dancers at keyframe positions
    if (curSelectedDancer && curSelectedStateKey && curBasis) {
      const orig = Dancer.get(curSelectedDancer, curInitState);
      for (const kf of curKeyframes) {
        const keyState = kf.states[curSelectedStateKey];
        if (!keyState) continue;
        const worldPos = relPosToWorldWithBasis(
          keyState.relPos,
          orig.pos,
          curBasis.xBasis,
          curBasis.yBasis,
        );
        const worldFacing = relFacingToWorldWithBasis(
          keyState.relFacing,
          curBasis.yBasis,
        );
        renderer.drawGhostDancer(
          curSelectedDancer,
          worldPos.x,
          worldPos.y,
          worldFacing,
          0.3,
        );
      }

      // Draw ghost during new-keyframe drag (not when dragging an existing ghost)
      const drag = dragRef.current;
      const dragDist = drag
        ? Math.hypot(
            drag.currentWorldX - drag.startWorldX,
            drag.currentWorldY - drag.startWorldY,
          )
        : 0;
      if (drag && dragDist >= 0.02 && drag.ghostKeyframeIndex == null) {
        const dragPos = new Vector(drag.startWorldX, drag.startWorldY);
        const dragDir = new Vector(
          drag.currentWorldX - drag.startWorldX,
          drag.currentWorldY - drag.startWorldY,
        );
        const dragFacing =
          dragDir.length() > 0.01 ? dragDir.normalize() : orig.facing;
        renderer.drawGhostDancer(
          curSelectedDancer,
          dragPos.x,
          dragPos.y,
          dragFacing,
          0.5,
        );
      }
    }
  }, []);

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(drawRafRef.current);
    drawRafRef.current = requestAnimationFrame(() => draw());
  }, [draw]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        ((e.key === "z" && e.shiftKey) || e.key === "y")
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

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
  }, [
    initState,
    selectedDancer,
    selectedStateKey,
    selectedBasis,
    basis,
    keyframes,
    previewAnimation,
    previewBeat,
    previewPathFrames,
    highlightedBasisSpec,
    requestDraw,
  ]);

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

      // Hit-test ghost dancers first (for dragging existing keyframes)
      if (selectedDancer && selectedStateKey && selectedBasis) {
        const orig = Dancer.get(selectedDancer, initState);
        const ghostHitRadius = 0.15; // world units
        for (let i = 0; i < keyframes.length; i++) {
          const roleState = keyframes[i].states[selectedStateKey];
          if (!roleState) continue;
          const ghostPos = relPosToWorldWithBasis(
            roleState.relPos,
            orig.pos,
            selectedBasis.xBasis,
            selectedBasis.yBasis,
          );
          const dist = Math.hypot(wx - ghostPos.x, wy - ghostPos.y);
          if (dist < ghostHitRadius) {
            beginTransient();
            dragRef.current = {
              startWorldX: wx,
              startWorldY: wy,
              currentWorldX: wx,
              currentWorldY: wy,
              shiftKey: e.shiftKey,
              ghostKeyframeIndex: i,
            };
            return;
          }
        }
      }

      // At t=0, hit-test real dancers for init-state dragging
      if (previewBeat === 0) {
        const hit = renderer.hitTestDancer(cx, cy, initState);
        if (hit) {
          beginTransient();
          dragRef.current = {
            startWorldX: wx,
            startWorldY: wy,
            currentWorldX: wx,
            currentWorldY: wy,
            dancerId: hit,
            shiftKey: e.shiftKey,
          };
          return;
        }
      }

      // Generic drag (for adding keyframes or clicking empty space)
      dragRef.current = {
        startWorldX: wx,
        startWorldY: wy,
        currentWorldX: wx,
        currentWorldY: wy,
        shiftKey: e.shiftKey,
      };
    },
    [
      previewBeat,
      initState,
      selectedDancer,
      selectedStateKey,
      selectedBasis,
      keyframes,
      beginTransient,
    ],
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

      if (dragRef.current.dancerId) {
        const id = dragRef.current.dancerId;
        if (dragRef.current.shiftKey) {
          const dancer = initState[id];
          const dir = new Vector(wx - dancer.pos.x, wy - dancer.pos.y);
          if (dir.length() > 0.01) {
            const next = produce(initState, (draft) => {
              draft[id].facing = dir.normalize();
            });
            updateTpl({ initState: next });
          }
        } else {
          const next = produce(initState, (draft) => {
            draft[id].pos = new Vector(wx, wy);
          });
          updateTpl({ initState: next });
        }
      } else if (
        dragRef.current.ghostKeyframeIndex != null &&
        selectedDancer &&
        selectedStateKey &&
        selectedBasis
      ) {
        const kfIdx = dragRef.current.ghostKeyframeIndex;
        const orig = Dancer.get(selectedDancer, initState);
        if (dragRef.current.shiftKey) {
          const keyState = keyframes[kfIdx].states[selectedStateKey];
          if (keyState) {
            const ghostWorldPos = relPosToWorldWithBasis(
              keyState.relPos,
              orig.pos,
              selectedBasis.xBasis,
              selectedBasis.yBasis,
            );
            const dir = new Vector(wx - ghostWorldPos.x, wy - ghostWorldPos.y);
            if (dir.length() > 0.01) {
              const newRelFacing = facingToRelWithBasis(
                dir.normalize(),
                selectedBasis.yBasis,
              );
              updateTpl({
                keyframes: keyframes.map((kf, i) =>
                  i === kfIdx
                    ? {
                        ...kf,
                        states: {
                          ...kf.states,
                          [selectedStateKey]: {
                            ...kf.states[selectedStateKey]!,
                            relFacing: newRelFacing,
                          },
                        },
                      }
                    : kf,
                ),
              });
            }
          }
        } else {
          const newRelPos = worldToRelWithBasis(
            new Vector(wx, wy),
            orig.pos,
            selectedBasis.xBasis,
            selectedBasis.yBasis,
          );
          updateTpl({
            keyframes: keyframes.map((kf, i) =>
              i === kfIdx
                ? {
                    ...kf,
                    states: {
                      ...kf.states,
                      [selectedStateKey]: {
                        ...kf.states[selectedStateKey]!,
                        relPos: newRelPos,
                      },
                    },
                  }
                : kf,
            ),
          });
        }
      }

      requestDraw();
    },
    [
      initState,
      selectedDancer,
      selectedStateKey,
      selectedBasis,
      keyframes,
      updateTpl,
      requestDraw,
    ],
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

      if (drag.ghostKeyframeIndex != null || drag.dancerId) {
        // Ghost drag or init-state drag: already applied during mousemove.
      } else if (isClick) {
        // Click = select dancer or deselect
        const renderer = rendererRef.current;
        const canvas = canvasRef.current;
        if (renderer && canvas) {
          const rect = canvas.getBoundingClientRect();
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;
          const hit = renderer.hitTestDancer(cx, cy, initState);
          if (hit) {
            setSelectedDancer(hit);
            const hitKey =
              templateType === "llrr" ? hit : Dancer.get(hit, initState).role;
            const filled = keyframes.filter(
              (kf) => kf.states[hitKey] != null,
            ).length;
            setNextSlotForKey(filled);
          } else {
            setSelectedDancer(null);
          }
        }
      } else if (selectedDancer && selectedStateKey && selectedBasis) {
        // Drag on empty space with selected dancer = add keyframe
        const orig = Dancer.get(selectedDancer, initState);
        const clickPos = new Vector(drag.startWorldX, drag.startWorldY);
        const dragDir = new Vector(
          drag.currentWorldX - drag.startWorldX,
          drag.currentWorldY - drag.startWorldY,
        );
        const worldFacing =
          dragDir.length() > 0.01 ? dragDir.normalize() : orig.facing;

        const relPos = worldToRelWithBasis(
          clickPos,
          orig.pos,
          selectedBasis.xBasis,
          selectedBasis.yBasis,
        );
        const relFacing = facingToRelWithBasis(
          worldFacing,
          selectedBasis.yBasis,
        );

        const slot = nextSlotForKey;

        const nextKeyframes = (() => {
          if (slot < keyframes.length) {
            return keyframes.map((kf, i) =>
              i === slot
                ? {
                    ...kf,
                    states: {
                      ...kf.states,
                      [selectedStateKey]: { relPos, relFacing },
                    },
                  }
                : kf,
            );
          } else {
            const lastT =
              keyframes.length > 0 ? keyframes[keyframes.length - 1].t : 0;
            return [
              ...keyframes,
              {
                t: lastT + keyframeDuration,
                states: {
                  [selectedStateKey]: { relPos, relFacing },
                },
              },
            ];
          }
        })();
        updateTpl({ keyframes: nextKeyframes });
        setNextSlotForKey(slot + 1);
      }

      endTransient();
      dragRef.current = null;
      requestDraw();
    },
    [
      templateType,
      selectedDancer,
      selectedStateKey,
      selectedBasis,
      initState,
      keyframes,
      keyframeDuration,
      nextSlotForKey,
      updateTpl,
      endTransient,
      requestDraw,
    ],
  );

  // ── Export / Import ──────────────────────────────────────────────────

  const exportTemplate = useCallback(():
    | LRInstructionTemplate
    | LLRRInstructionTemplate => {
    if (templateType === "llrr") {
      return {
        name,
        defaultBeats,
        fieldsDisplay,
        basis,
        keyframes: keyframes.map((kf) => ({
          t: kf.t,
          states: buildEnumRecord(
            ProtoIdSchema,
            (p) => kf.states[p] ?? { relPos: new Vector(0, 0), relFacing: 0 },
          ),
        })),
      };
    }
    return {
      name,
      defaultBeats,
      fieldsDisplay,
      basis,
      keyframes: keyframes.map((kf) => ({
        t: kf.t,
        states: buildEnumRecord(
          RoleSchema,
          (r) => kf.states[r] ?? { relPos: new Vector(0, 0), relFacing: 0 },
        ),
      })),
    };
  }, [name, defaultBeats, fieldsDisplay, keyframes, templateType, basis]);

  const exportTypeScript = useCallback(() => {
    const template = exportTemplate();
    const jsonBody = JSON.stringify(
      template,
      (_key, value) => {
        if (value instanceof Vector) {
          return { x: value.x, y: value.y };
        }
        return value;
      },
      2,
    );
    const schemaName =
      templateType === "llrr"
        ? "LLRRInstructionTemplateSchema"
        : "LRInstructionTemplateSchema";
    return [
      `import { typedParse } from "../../utils";`,
      `import { ${schemaName} } from "./_base";`,
      ``,
      `export default typedParse(${schemaName}, ${jsonBody});`,
      ``,
    ].join("\n");
  }, [exportTemplate, templateType]);

  const loadTemplate = useCallback(
    (
      template: LRInstructionTemplate | LLRRInstructionTemplate,
      type: TemplateType,
    ) => {
      setTpl({
        ...tpl,
        templateType: type,
        name: template.name,
        defaultBeats: template.defaultBeats,
        fieldsDisplay: template.fieldsDisplay,
        basis: template.basis,
        keyframes: template.keyframes.map((kf) => ({
          t: kf.t,
          states: kf.states,
        })),
      });
    },
    [tpl, setTpl],
  );

  const handleImportJson = useCallback(
    (text: string) => {
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

      const schema =
        templateType === "llrr"
          ? LLRRInstructionTemplateSchema
          : LRInstructionTemplateSchema;
      const result = schema.safeParse(parsed);
      if (!result.success) {
        setJsonError(
          result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("\n"),
        );
        return;
      }

      loadTemplate(result.data, templateType);
    },
    [templateType, loadTemplate],
  );

  const handlePasteInitState = useCallback(
    (text: string) => {
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
      updateTpl({ initState: result.data });
    },
    [updateTpl],
  );

  // ── fieldsDisplay parsing ────────────────────────────────────────────

  const handleFieldsDisplayChange = useCallback(
    (text: string) => {
      setFieldsDisplayText(text);
      // Parse: text segments separated by {basis_x} or {basis_y}
      const result: LRInstructionTemplate["fieldsDisplay"] = [];
      const re = /\{(basis_x|basis_y)\}/g;
      let lastIdx = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        const before = text.slice(lastIdx, match.index);
        if (before) result.push(before);
        result.push({ field: match[1] === "basis_x" ? "basis_x" : "basis_y" });
        lastIdx = re.lastIndex;
      }
      const after = text.slice(lastIdx);
      if (after) result.push(after);
      updateTpl({ fieldsDisplay: result });
    },
    [updateTpl],
  );

  // ── Render ───────────────────────────────────────────────────────────

  const basisSpecOptions = BasisSpecSchema.options;

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

        <div className="def-instr-section">
          <button disabled={!canUndo} onClick={undo}>
            Undo
          </button>{" "}
          <button disabled={!canRedo} onClick={redo}>
            Redo
          </button>
        </div>

        {/* Template metadata */}
        <div className="def-instr-section">
          <h3>Template</h3>
          <label>
            Type:{" "}
            <select
              value={templateType}
              onChange={(e) => {
                const next = e.target.value === "llrr" ? "llrr" : "lr";
                updateTpl({
                  templateType: next,
                  keyframes: [],
                  basis: { ...DEFAULT_TEMPLATE_BASIS },
                });
                setSelectedDancer(null);
              }}
            >
              <option value="lr">LR (per-role)</option>
              <option value="llrr">LLRR (per-dancer)</option>
            </select>
          </label>
          <label>
            Load template:{" "}
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                if (LRTemplateIdSchema.safeParse(val).success) {
                  loadTemplate(
                    allLRTemplates[LRTemplateIdSchema.parse(val)],
                    "lr",
                  );
                } else if (LLRRTemplateIdSchema.safeParse(val).success) {
                  loadTemplate(
                    allLLRRTemplates[LLRRTemplateIdSchema.parse(val)],
                    "llrr",
                  );
                }
                e.target.value = "";
              }}
              value=""
            >
              <option value="" disabled>
                Choose...
              </option>
              <optgroup label="LR templates">
                {LRTemplateIdSchema.options.map((id) => (
                  <option key={id} value={id}>
                    {allLRTemplates[id].name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="LLRR templates">
                {LLRRTemplateIdSchema.options.map((id) => (
                  <option key={id} value={id}>
                    {allLLRRTemplates[id].name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label>
            Name:{" "}
            <input
              type="text"
              value={name}
              onChange={(e) => updateTpl({ name: e.target.value })}
              className="def-instr-text-input"
            />
          </label>
          <label>
            Default beats:{" "}
            <input
              type="number"
              value={defaultBeats}
              onChange={(e) =>
                updateTpl({ defaultBeats: Number(e.target.value) })
              }
              className="def-instr-number-input"
              min={1}
            />
          </label>
        </div>

        {/* Basis */}
        <div className="def-instr-section">
          <h3>Basis</h3>
          <label>
            X axis:{" "}
            <SearchableDropdown
              options={basisSpecOptions}
              value={basis.x}
              onChange={(spec) => updateTpl({ basis: { ...basis, x: spec } })}
              onHighlight={(spec) => {
                const parsed = BasisVectorSpecSchema.safeParse(spec);
                setHighlightedBasisSpec(parsed.success ? parsed.data : null);
              }}
              getLabel={basisSpecToText}
              selectOnly
            />
          </label>
          {basisErrors.x && (
            <div className="def-instr-error">{basisErrors.x}</div>
          )}
          {(basis.x === "choreographer_specified_direction" ||
            basis.x === "choreographer_specified_identifier") && (
            <label>
              {"...assume X is: "}
              <SearchableDropdown
                options={
                  basis.x === "choreographer_specified_direction"
                    ? CalledDirectionSchema.options
                    : CalledIdentifierSchema.options
                }
                value={
                  basis.assumedX ??
                  (basis.x === "choreographer_specified_direction"
                    ? CalledDirectionSchema.options[0]
                    : CalledIdentifierSchema.options[0])
                }
                onChange={(spec) =>
                  updateTpl({
                    basis: {
                      ...basis,
                      assumedX: BasisVectorSpecSchema.parse(spec),
                    },
                  })
                }
                onHighlight={(spec) => setHighlightedBasisSpec(spec)}
                getLabel={basisSpecToText}
                selectOnly
              />
            </label>
          )}
          <label>
            Y axis:{" "}
            <SearchableDropdown
              options={basisSpecOptions}
              value={basis.y}
              onChange={(spec) => updateTpl({ basis: { ...basis, y: spec } })}
              onHighlight={(spec) => {
                const parsed = BasisVectorSpecSchema.safeParse(spec);
                setHighlightedBasisSpec(parsed.success ? parsed.data : null);
              }}
              getLabel={basisSpecToText}
              selectOnly
            />
          </label>
          {basisErrors.y && (
            <div className="def-instr-error">{basisErrors.y}</div>
          )}
          {(basis.y === "choreographer_specified_direction" ||
            basis.y === "choreographer_specified_identifier") && (
            <label>
              {"...assume Y is: "}
              <SearchableDropdown
                options={
                  basis.y === "choreographer_specified_direction"
                    ? CalledDirectionSchema.options
                    : CalledIdentifierSchema.options
                }
                value={
                  basis.assumedY ??
                  (basis.y === "choreographer_specified_direction"
                    ? CalledDirectionSchema.options[0]
                    : CalledIdentifierSchema.options[0])
                }
                onChange={(spec) =>
                  updateTpl({
                    basis: {
                      ...basis,
                      assumedY: BasisVectorSpecSchema.parse(spec),
                    },
                  })
                }
                onHighlight={(spec) => setHighlightedBasisSpec(spec)}
                getLabel={basisSpecToText}
                selectOnly
              />
            </label>
          )}
        </div>

        {/* Fields display */}
        <div className="def-instr-section">
          <h3>Fields Display</h3>
          <input
            type="text"
            value={fieldsDisplayText}
            onChange={(e) => handleFieldsDisplayChange(e.target.value)}
            placeholder='e.g. "chain to your {basis_x}"'
            className="def-instr-text-input wide"
          />
          <div className="def-instr-hint">
            Use {"{basis_x}"} or {"{basis_y}"} as placeholders
          </div>
        </div>

        {/* Initial State */}
        <div className="def-instr-section">
          <h3>Initial State</h3>
          <p className="def-instr-hint">
            Drag dancers to reposition. Shift+drag to change facing. Click to
            select for keyframe editing.
          </p>
          <label>
            Formation preset:{" "}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  updateTpl({
                    initState: resolveInitFormation(
                      InitFormationNameSchema.parse(e.target.value),
                    ),
                  });
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Choose...
              </option>
              {InitFormationNameSchema.options.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
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

        {/* Keyframes */}
        <div className="def-instr-section">
          <h3>Keyframes</h3>
          <div className="def-instr-dancer-select">
            <label>Selected dancer: </label>
            {ALL_PROTO_IDS.map((id) => (
              <button
                key={id}
                className={selectedDancer === id ? "active" : ""}
                onClick={() => {
                  setSelectedDancer(id);
                  const key =
                    templateType === "llrr"
                      ? id
                      : Dancer.get(id, initState).role;
                  const filled = keyframes.filter(
                    (kf) => kf.states[key] != null,
                  ).length;
                  setNextSlotForKey(filled);
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
              Drag on the canvas to add a keyframe. Position = click start,
              facing = drag direction.
            </p>
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
                      updateTpl({
                        keyframes: keyframes.filter((_, j) => j !== i),
                      })
                    }
                  >
                    x
                  </button>
                </div>
              ))}
              <button onClick={() => updateTpl({ keyframes: [] })}>
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Preview controls */}
        {previewAnimation && (
          <div className="def-instr-section">
            <h4>Preview</h4>
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
