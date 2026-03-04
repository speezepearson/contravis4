import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";

import type { ProtoId } from "../contraCore";
import { sortedExampleDances } from "../exampleDances";
import type { GenerateError } from "../generate";
import { formatDanceParseError, splitLists, splitWithLists } from "../generate";
import { inferProgression } from "../inferProgression";
import {
  type AtomicInstruction,
  AtomicInstructionSchema,
} from "../instructions/_atomic";
import type { ContraAnimation } from "../instructions/_base";
import { InstructionIdSchema } from "../instructions/_base";
import type {
  InitFormation,
  Instruction,
  InstructionId,
} from "../instructions/index";
import {
  DanceSchema,
  InitFormationSchema,
  initFormationStates,
  instructionDuration,
  InstructionSchema,
} from "../instructions/index";
import type { Split } from "../instructions/split";
import { assertNever } from "../utils";
import type { DancerState } from "../worldState";
import { AllemandeFields } from "./fields/AllemandeFields";
import { BalanceFields } from "./fields/BalanceFields";
import { BalanceTheRingFields } from "./fields/BalanceTheRingFields";
import { BoxCirculateFields } from "./fields/BoxCirculateFields";
import { BoxTheGnatFields } from "./fields/BoxTheGnatFields";
import { CaliforniaTwirlFields } from "./fields/CaliforniaTwirlFields";
import { CircleFields } from "./fields/CircleFields";
import { DoSiDoFields } from "./fields/DoSiDoFields";
import { DropHandsFields } from "./fields/DropHandsFields";
import { FaceFields } from "./fields/FaceFields";
import { FormLongWavesFields } from "./fields/FormLongWavesFields";
import { FormShortWavesFields } from "./fields/FormShortWavesFields";
import { GiveAndTakeIntoSwingFields } from "./fields/GiveAndTakeIntoSwingFields";
import { MadRobinFields } from "./fields/MadRobinFields";
import { PassByFields } from "./fields/PassByFields";
import { PetronellaFields } from "./fields/PetronellaFields";
import { PullByFields } from "./fields/PullByFields";
import { RelabelFields } from "./fields/RelabelFields";
import { RollAwayFields } from "./fields/RollAwayFields";
import { RoryOMoreFields } from "./fields/RoryOMoreFields";
import { ShoulderRoundFields } from "./fields/ShoulderRoundFields";
import { SplitFields } from "./fields/SplitFields";
import { SquareThroughFields } from "./fields/SquareThroughFields";
import { StepFields } from "./fields/StepFields";
import { SwingFields } from "./fields/SwingFields";
import { TakeHandsFields } from "./fields/TakeHandsFields";
import { TakeHandsInRingsFields } from "./fields/TakeHandsInRingsFields";
import { makeDefaultInstruction, makeInstructionId } from "./fieldUtils";
import type { InlineDropdownHandle } from "./InlineDropdown";
import { InlineDropdown } from "./InlineDropdown";
import { InlineNumber } from "./InlineNumber";
import { InstructionEditContext } from "./InstructionEditContext";
import { groupIntoSections, spillTargetLabel } from "./sectionGrouping";

export type ActionOptionType = Instruction["type"];

const ACTION_OPTIONS: ActionOptionType[] = [
  "allemande",
  "balance",
  "balance_the_ring",
  "box_circulate",
  "box_the_gnat",
  "california_twirl",
  "circle",
  "do_si_do",
  "drop_hands",
  "face",
  "form_long_waves",
  "form_short_waves",
  "give_and_take_into_swing",
  "mad_robin",
  "pass_by",
  "petronella",
  "pull_by",
  "relabel",
  "roll_away",
  "rory_o_more",
  "shoulder_round",
  "square_through",
  "split",
  "step",
  "swing",
  "take_hands_in_rings",
  "take_hands",
];
const ACTION_LABELS: Record<string, string> = {
  allemande: "allemande",
  balance: "balance",
  balance_the_ring: "balance the ring",
  box_circulate: "box circulate",
  box_the_gnat: "box the gnat",
  california_twirl: "California twirl",
  circle: "circle",
  do_si_do: "do si do",
  drop_hands: "drop hands",
  face: "face",
  form_long_waves: "form long waves",
  form_short_waves: "form short waves",
  give_and_take_into_swing: "give & take",
  mad_robin: "mad robin",
  pass_by: "pass by",
  petronella: "petronella",
  pull_by: "pull by",
  relabel: "relabel",
  roll_away: "roll away",
  rory_o_more: "Rory O'More",
  shoulder_round: "shoulder round",
  square_through: "square through",
  split: "split",
  step: "step",
  swing: "swing",
  take_hands_in_rings: "take hands in rings",
  take_hands: "take hands",
};

function splitGroupLabel(by: Split["by"], list: "A" | "B"): string {
  if (by === "role") return list === "A" ? "Larks" : "Robins";
  return list === "A" ? "Ups" : "Downs";
}

function parseContainerId(
  id: string,
):
  | { type: "top" }
  | { type: "split"; splitId: InstructionId; list: "A" | "B" } {
  if (id.startsWith("split-") && (id.endsWith("-A") || id.endsWith("-B"))) {
    const list = z.enum(["A", "B"]).parse(id.slice(-1));
    return {
      type: "split",
      splitId: InstructionIdSchema.parse(id.slice(6, -2)),
      list,
    };
  }
  return { type: "top" };
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

function instructionContainsId(instr: Instruction, id: InstructionId): boolean {
  if (instr.id === id) return true;
  if (instr.type === "split") {
    const [listA, listB] = splitLists(instr);
    return [...listA, ...listB].some((c) => c.id === id);
  }
  return false;
}

function removeFromTree(
  instrs: Instruction[],
  targetId: InstructionId,
): [Instruction[], Instruction | null] {
  const topIdx = instrs.findIndex((i) => i.id === targetId);
  if (topIdx !== -1) {
    return [
      [...instrs.slice(0, topIdx), ...instrs.slice(topIdx + 1)],
      instrs[topIdx],
    ];
  }
  let removed: Instruction | null = null;
  const mapped = instrs.map((i) => {
    if (removed) return i;
    if (i.type === "split") {
      const [listA, listB] = splitLists(i);
      const aIdx = listA.findIndex((s) => s.id === targetId);
      if (aIdx !== -1) {
        removed = InstructionSchema.parse(listA[aIdx]);
        return InstructionSchema.parse({
          ...i,
          ...splitWithLists(
            i.by,
            [...listA.slice(0, aIdx), ...listA.slice(aIdx + 1)],
            listB,
          ),
        });
      }
      const bIdx = listB.findIndex((s) => s.id === targetId);
      if (bIdx !== -1) {
        removed = InstructionSchema.parse(listB[bIdx]);
        return InstructionSchema.parse({
          ...i,
          ...splitWithLists(i.by, listA, [
            ...listB.slice(0, bIdx),
            ...listB.slice(bIdx + 1),
          ]),
        });
      }
    }
    return i;
  });
  return [mapped, removed];
}

function insertIntoContainer(
  instrs: Instruction[],
  containerId: string,
  item: Instruction,
  index: number,
): Instruction[] {
  const parsed = parseContainerId(containerId);
  if (parsed.type === "top") {
    const copy = [...instrs];
    copy.splice(index, 0, item);
    return copy;
  }
  return instrs.map((i) => {
    if (i.type === "split" && i.id === parsed.splitId) {
      const [listA, listB] = splitLists(i);
      const list = parsed.list === "A" ? listA : listB;
      const copy = [...list];
      copy.splice(index, 0, AtomicInstructionSchema.parse(item));
      const newLists =
        parsed.list === "A"
          ? splitWithLists(i.by, copy, listB)
          : splitWithLists(i.by, listA, copy);
      return { ...i, ...newLists };
    }
    return i;
  });
}

function reorderInContainer(
  instrs: Instruction[],
  containerId: string,
  oldIndex: number,
  newIndex: number,
): Instruction[] {
  const parsed = parseContainerId(containerId);
  if (parsed.type === "top") return arrayMove(instrs, oldIndex, newIndex);
  return instrs.map((i) => {
    if (i.type === "split" && i.id === parsed.splitId) {
      const [listA, listB] = splitLists(i);
      const newLists =
        parsed.list === "A"
          ? splitWithLists(i.by, arrayMove(listA, oldIndex, newIndex), listB)
          : splitWithLists(i.by, listA, arrayMove(listB, oldIndex, newIndex));
      return { ...i, ...newLists };
    }
    return i;
  });
}

function getContainerItems(
  instrs: Instruction[],
  containerId: string,
): Instruction[] | null {
  const parsed = parseContainerId(containerId);
  if (parsed.type === "top") return instrs;
  for (const i of instrs) {
    if (i.type === "split" && i.id === parsed.splitId) {
      const [listA, listB] = splitLists(i);
      return z
        .array(InstructionSchema)
        .parse(parsed.list === "A" ? listA : listB);
    }
  }
  return null;
}

function replaceInTree(
  instrs: Instruction[],
  id: InstructionId,
  replacement: Instruction,
): Instruction[] {
  return instrs.map((i) => {
    if (i.id === id) return replacement;
    if (i.type === "split") {
      const [listA, listB] = splitLists(i);
      if (!listA.some((s) => s.id === id) && !listB.some((s) => s.id === id))
        return i;
      return InstructionSchema.parse({
        ...i,
        ...splitWithLists(
          i.by,
          listA.map((sub) =>
            sub.id === id ? AtomicInstructionSchema.parse(replacement) : sub,
          ),
          listB.map((sub) =>
            sub.id === id ? AtomicInstructionSchema.parse(replacement) : sub,
          ),
        ),
      });
    }
    return i;
  });
}

function flatInstructionIds(instrs: Instruction[]): InstructionId[] {
  const ids: InstructionId[] = [];
  for (const i of instrs) {
    ids.push(i.id);
    if (i.type === "split") {
      const [listA, listB] = splitLists(i);
      for (const s of listA) ids.push(s.id);
      for (const s of listB) ids.push(s.id);
    }
  }
  return ids;
}

function removeMultipleFromTop(
  instrs: Instruction[],
  ids: Set<InstructionId>,
): [Instruction[], Instruction[]] {
  const remaining: Instruction[] = [];
  const removed: Instruction[] = [];
  for (const i of instrs) {
    if (ids.has(i.id)) {
      removed.push(i);
    } else {
      remaining.push(i);
    }
  }
  return [remaining, removed];
}

interface Props {
  instructions: Instruction[];
  setInstructions: (instructions: Instruction[]) => void;
  initFormation: InitFormation;
  setInitFormation: (formation: InitFormation) => void;
  activeId: InstructionId | null;
  generateErrors: GenerateError[];
  animation: ContraAnimation | null;
  onHoverInstruction?: (id: InstructionId | null) => void;
  onEditInstruction?: (id: InstructionId) => void;
  onSkipToInstruction?: (id: InstructionId) => void;
}

function SortableItem({
  id,
  children,
}: {
  id: InstructionId;
  children: (dragHandleProps: Record<string, unknown>) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

function DropZone({ containerId }: { containerId: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: containerId });
  return (
    <div
      ref={setNodeRef}
      className={`drop-zone${isOver ? " drop-zone-active" : ""}`}
    />
  );
}

function doesRequireBeatsInput(type: AtomicInstruction["type"]): boolean {
  switch (type) {
    case "allemande":
    case "balance":
    case "balance_the_ring":
    case "box_circulate":
    case "box_the_gnat":
    case "california_twirl":
    case "circle":
    case "do_si_do":
    case "give_and_take_into_swing":
    case "mad_robin":
    case "pass_by":
    case "petronella":
    case "pull_by":
    case "roll_away":
    case "rory_o_more":
    case "shoulder_round":
    case "square_through":
    case "step":
    case "swing":
      return true;
    case "drop_hands":
    case "face":
    case "form_long_waves":
    case "form_short_waves":
    case "relabel":
    case "take_hands_in_rings":
    case "take_hands":
      return false;
    default:
      return assertNever(type);
  }
}

function BeatGutter({
  instruction,
  onChange,
}: {
  instruction: Instruction;
  onChange: (instr: Instruction) => void;
}) {
  const hasBeat =
    instruction.type !== "split" && doesRequireBeatsInput(instruction.type);
  const currentBeats = hasBeat ? (instruction as AtomicInstruction).beats : 0;

  if (!hasBeat) return <span className="beat-gutter" />;

  function commitBeats(n: number) {
    const raw = { ...instruction, beats: n };
    const result = InstructionSchema.safeParse(raw);
    if (result.success) onChange(result.data);
  }

  return (
    <span className="beat-gutter">
      <InlineNumber
        value={String(currentBeats)}
        onTextChange={(v) => {
          const n = Number(v);
          if (!isNaN(n)) commitBeats(n);
        }}
        onDrag={(n) => commitBeats(n)}
        step={0.5}
        suffix=" beats"
      />
    </span>
  );
}

function InlineForm({
  instruction,
  onChange,
  autoFocusAction,
  allowContainers = true,
}: {
  instruction: Instruction;
  onChange: (instr: Instruction) => void;
  autoFocusAction?: boolean;
  allowContainers?: boolean;
}) {
  const actionRef = useRef<InlineDropdownHandle>(null);
  const [valid, setValid] = useState(true);

  useEffect(() => {
    if (autoFocusAction) actionRef.current?.focus();
  }, [autoFocusAction]);

  const actionOptions = allowContainers
    ? ACTION_OPTIONS
    : ACTION_OPTIONS.filter((o) => o !== "split");

  function handleActionChange(newAction: ActionOptionType) {
    if (newAction !== instruction.type) {
      onChange(makeDefaultInstruction(newAction, instruction.id));
      setValid(true);
    }
  }

  function handleFieldChange(updated: Instruction) {
    onChange(updated);
    setValid(true);
  }

  function handleInvalid() {
    setValid(false);
  }

  const common = { onChange: handleFieldChange, onInvalid: handleInvalid };

  return (
    <span className={`inline-form${valid ? "" : " invalid"}`}>
      <InlineDropdown
        ref={actionRef}
        options={actionOptions}
        value={instruction.type}
        onChange={(v) => handleActionChange(v as ActionOptionType)}
        getLabel={(v) => ACTION_LABELS[v] ?? v}
      />{" "}
      {(() => {
        switch (instruction.type) {
          case "allemande":
            return <AllemandeFields {...common} instruction={instruction} />;
          case "balance":
            return <BalanceFields {...common} instruction={instruction} />;
          case "balance_the_ring":
            return (
              <BalanceTheRingFields {...common} instruction={instruction} />
            );
          case "box_circulate":
            return <BoxCirculateFields {...common} instruction={instruction} />;
          case "box_the_gnat":
            return <BoxTheGnatFields {...common} instruction={instruction} />;
          case "california_twirl":
            return (
              <CaliforniaTwirlFields {...common} instruction={instruction} />
            );
          case "circle":
            return <CircleFields {...common} instruction={instruction} />;
          case "do_si_do":
            return <DoSiDoFields {...common} instruction={instruction} />;
          case "drop_hands":
            return <DropHandsFields {...common} instruction={instruction} />;
          case "face":
            return <FaceFields {...common} instruction={instruction} />;
          case "form_long_waves":
            return (
              <FormLongWavesFields {...common} instruction={instruction} />
            );
          case "form_short_waves":
            return (
              <FormShortWavesFields {...common} instruction={instruction} />
            );
          case "give_and_take_into_swing":
            return (
              <GiveAndTakeIntoSwingFields
                {...common}
                instruction={instruction}
              />
            );
          case "mad_robin":
            return <MadRobinFields {...common} instruction={instruction} />;
          case "pass_by":
            return <PassByFields {...common} instruction={instruction} />;
          case "petronella":
            return <PetronellaFields {...common} instruction={instruction} />;
          case "pull_by":
            return <PullByFields {...common} instruction={instruction} />;
          case "relabel":
            return <RelabelFields {...common} instruction={instruction} />;
          case "roll_away":
            return <RollAwayFields {...common} instruction={instruction} />;
          case "rory_o_more":
            return <RoryOMoreFields {...common} instruction={instruction} />;
          case "shoulder_round":
            return (
              <ShoulderRoundFields {...common} instruction={instruction} />
            );
          case "square_through":
            return (
              <SquareThroughFields {...common} instruction={instruction} />
            );
          case "split":
            return <SplitFields {...common} instruction={instruction} />;
          case "step":
            return <StepFields {...common} instruction={instruction} />;
          case "swing":
            return <SwingFields {...common} instruction={instruction} />;
          case "take_hands_in_rings":
            return (
              <TakeHandsInRingsFields {...common} instruction={instruction} />
            );
          case "take_hands":
            return <TakeHandsFields {...common} instruction={instruction} />;
          default:
            assertNever(instruction);
        }
      })()}
    </span>
  );
}

export default memo(function CommandPane({
  instructions,
  setInstructions,
  initFormation,
  setInitFormation,
  activeId,
  generateErrors,
  animation,
  onHoverInstruction,
  onEditInstruction,
  onSkipToInstruction,
}: Props) {
  const [newlyAddedId, setNewlyAddedId] = useState<InstructionId | null>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [pasteFeedback, setPasteFeedback] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<InstructionId>>(new Set());
  const [activeDragId, setActiveDragId] = useState<InstructionId | null>(null);
  const lastClickedIdRef = useRef<InstructionId | null>(null);
  const lastClickWasSelectRef = useRef(true);

  const prevInstructionsRef = useRef(instructions);
  useEffect(() => {
    if (prevInstructionsRef.current !== instructions) {
      const prevIds = new Set(flatInstructionIds(prevInstructionsRef.current));
      const curIds = new Set(flatInstructionIds(instructions));
      const overlap = [...prevIds].filter((id) => curIds.has(id)).length;
      if (overlap < prevIds.size * 0.5 && prevIds.size > 0) {
        setSelectedIds(new Set());
      }
      prevInstructionsRef.current = instructions;
    }
  }, [instructions]);

  const allFlatIds = useMemo(
    () => flatInstructionIds(instructions),
    [instructions],
  );

  // Pre-compute dancer states at each instruction's start beat using animation
  const dancerStatesById = useMemo(() => {
    const result = new Map<InstructionId, Record<ProtoId, DancerState>>();
    if (!animation) return result;

    let beat = 0;
    for (const instr of instructions) {
      try {
        const frame = animation.getFrame(beat);
        result.set(instr.id, frame);
      } catch {
        // SWALLOW_EXCEPTION: animation may not cover all beats if there was a generate error; we just skip those instructions
      }
      if (instr.type === "split") {
        const [listA, listB] = splitLists(instr);
        let b = beat;
        for (const sub of listA) {
          try {
            const frame = animation.getFrame(b);
            result.set(sub.id, frame);
          } catch {
            // SWALLOW_EXCEPTION: same as above
          }
          b += sub.beats;
        }
        b = beat;
        for (const sub of listB) {
          try {
            const frame = animation.getFrame(b);
            result.set(sub.id, frame);
          } catch {
            // SWALLOW_EXCEPTION: same as above
          }
          b += sub.beats;
        }
      }
      beat += instructionDuration(instr);
    }
    return result;
  }, [instructions, animation]);

  const totalBeats = useMemo(
    () => instructions.reduce((s, i) => s + instructionDuration(i), 0),
    [instructions],
  );

  const sections = useMemo(
    () => groupIntoSections(instructions),
    [instructions],
  );

  const progression = useMemo(() => {
    if (!animation) return null;
    return inferProgression(animation, initFormationStates[initFormation]);
  }, [animation, initFormation]);

  const handleCheckboxClick = useCallback(
    (id: InstructionId, event: React.MouseEvent) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (event.shiftKey && lastClickedIdRef.current) {
          const lastIdx = allFlatIds.indexOf(lastClickedIdRef.current);
          const curIdx = allFlatIds.indexOf(id);
          if (lastIdx !== -1 && curIdx !== -1) {
            const lo = Math.min(lastIdx, curIdx);
            const hi = Math.max(lastIdx, curIdx);
            for (let i = lo; i <= hi; i++) {
              if (lastClickWasSelectRef.current) {
                next.add(allFlatIds[i]);
              } else {
                next.delete(allFlatIds[i]);
              }
            }
          } else {
            const selecting = !next.has(id);
            if (selecting) next.add(id);
            else next.delete(id);
            lastClickWasSelectRef.current = selecting;
          }
        } else {
          const selecting = !next.has(id);
          if (selecting) next.add(id);
          else next.delete(id);
          lastClickWasSelectRef.current = selecting;
        }
        return next;
      });
      lastClickedIdRef.current = id;
    },
    [allFlatIds],
  );

  useEffect(() => {
    if (newlyAddedId) setNewlyAddedId(null);
  }, [newlyAddedId]);

  const errorById = useMemo(() => {
    const map = new Map<InstructionId, GenerateError>();
    for (const err of generateErrors) {
      map.set(err.instructionId, err);
    }
    return map;
  }, [generateErrors]);

  function handleChange(id: InstructionId, updated: Instruction) {
    setInstructions(replaceInTree(instructions, id, updated));
  }

  function handleAdd(containerId: string, index: number) {
    const id = makeInstructionId();
    const defaultInstr = makeDefaultInstruction("balance", id);
    const newInstructions = insertIntoContainer(
      instructions,
      containerId,
      defaultInstr,
      index,
    );
    setInstructions(newInstructions);
    setNewlyAddedId(id);
  }

  function handleRemove(id: InstructionId) {
    const [newTree] = removeFromTree(instructions, id);
    setInstructions(newTree);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(InstructionIdSchema.parse(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const srcContainer = z
      .string()
      .catch("top")
      .parse(active.data.current?.sortable?.containerId);
    const overSortableContainer = z
      .string()
      .optional()
      .parse(over.data.current?.sortable?.containerId);
    const destContainer = overSortableContainer ?? String(over.id);
    const draggedId = InstructionIdSchema.parse(active.id);
    const isMultiDrag = selectedIds.has(draggedId) && selectedIds.size > 1;

    if (active.id === over.id && !isMultiDrag) return;

    if (
      isMultiDrag &&
      srcContainer === "top" &&
      (destContainer === "top" || overSortableContainer === "top")
    ) {
      const selectedTopIds = new Set(
        instructions.filter((i) => selectedIds.has(i.id)).map((i) => i.id),
      );
      if (selectedTopIds.size === 0) return;

      const [remaining, movedItems] = removeMultipleFromTop(
        instructions,
        selectedTopIds,
      );
      const overIdx = remaining.findIndex((i) => i.id === over.id);
      const firstSelectedOrigIdx = instructions.findIndex((i) =>
        selectedTopIds.has(i.id),
      );
      const overOrigIdx = instructions.findIndex((i) => i.id === over.id);
      const draggingForward = firstSelectedOrigIdx < overOrigIdx;
      const insertIdx =
        overIdx !== -1 ? overIdx + (draggingForward ? 1 : 0) : remaining.length;
      const newInstructions = [
        ...remaining.slice(0, insertIdx),
        ...movedItems,
        ...remaining.slice(insertIdx),
      ];
      setInstructions(newInstructions);
      return;
    }

    if (active.id === over.id) return;

    if (srcContainer === destContainer && overSortableContainer) {
      const items = getContainerItems(instructions, srcContainer);
      if (!items) return;
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setInstructions(
          reorderInContainer(instructions, srcContainer, oldIndex, newIndex),
        );
      }
      return;
    }

    const draggedInstr = findInstructionById(instructions, draggedId);
    if (!draggedInstr) return;

    const destParsed = parseContainerId(destContainer);
    if (destParsed.type === "split" && draggedInstr.type === "split") return;
    if (
      destParsed.type === "split" &&
      instructionContainsId(draggedInstr, destParsed.splitId)
    )
      return;

    const [treeWithout, removed] = removeFromTree(instructions, draggedId);
    if (!removed) return;

    let insertIdx: number;
    if (overSortableContainer) {
      const destItems = getContainerItems(treeWithout, destContainer);
      const overIdx = destItems
        ? destItems.findIndex((i) => i.id === over.id)
        : -1;
      insertIdx = overIdx !== -1 ? overIdx : (destItems?.length ?? 0);
    } else {
      insertIdx = getContainerItems(treeWithout, destContainer)?.length ?? 0;
    }

    setInstructions(
      insertIntoContainer(treeWithout, destContainer, removed, insertIdx),
    );
  }

  function copyJson() {
    const dance = { initFormation, instructions };
    navigator.clipboard.writeText(JSON.stringify(dance, null, 2));
    setCopyFeedback("Copied!");
    setTimeout(() => setCopyFeedback(""), 1500);
  }

  function tryLoadJson(text: string) {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      console.error(e);
      setPasteFeedback(
        `Invalid JSON: ${e instanceof SyntaxError ? e.message : String(e)}`,
      );
      setTimeout(() => setPasteFeedback(""), 3000);
      return;
    }
    const result = DanceSchema.safeParse(raw);
    if (!result.success) {
      console.error(result.error);
      setPasteFeedback(
        `Invalid dance:\n${formatDanceParseError(result.error, raw)}`,
      );
      setTimeout(() => setPasteFeedback(""), 10000);
      return;
    }
    const parsed = result.data;
    setPasteFeedback("");
    setInitFormation(parsed.initFormation);
    setInstructions(parsed.instructions);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function renderAddGap(containerId: string, index: number) {
    return (
      <div className="add-gap" key={`gap-${containerId}-${index}`}>
        <button
          className="add-gap-btn"
          onClick={() => handleAdd(containerId, index)}
          title="Add instruction"
        >
          +
        </button>
      </div>
    );
  }

  function renderInstruction(
    instr: Instruction,
    dragHandleProps: Record<string, unknown>,
    options?: { extraClass?: string; inSplit?: boolean },
  ) {
    const isSelected = selectedIds.has(instr.id);
    const isDraggedAway =
      activeDragId !== null &&
      selectedIds.has(activeDragId) &&
      selectedIds.size > 1 &&
      isSelected &&
      instr.id !== activeDragId;
    return (
      <InstructionEditContext.Provider
        value={{
          onPopoverOpen: () => onEditInstruction?.(instr.id),
          dancerStates: dancerStatesById.get(instr.id),
        }}
      >
        <div
          className={`instruction-item${options?.extraClass ? " " + options.extraClass : ""}${instr.id === activeId ? " active" : ""}${errorById.has(instr.id) ? " errored" : ""}${isSelected ? " selected" : ""}${isDraggedAway ? " dragged-away" : ""}`}
          onClick={() => onSkipToInstruction?.(instr.id)}
          onMouseEnter={() => onHoverInstruction?.(instr.id)}
          onMouseLeave={() => onHoverInstruction?.(null)}
        >
          <BeatGutter
            instruction={instr}
            onChange={(updated) => handleChange(instr.id, updated)}
          />
          <InlineForm
            instruction={instr}
            onChange={(updated) => handleChange(instr.id, updated)}
            autoFocusAction={newlyAddedId === instr.id}
            allowContainers={!options?.inSplit}
          />
          <button
            className="delete-btn"
            onClick={() => handleRemove(instr.id)}
            title="Delete"
          >
            {"\u00D7"}
          </button>
          <input
            type="checkbox"
            className="select-checkbox"
            checked={isSelected}
            onClick={(e) => handleCheckboxClick(instr.id, e)}
            onChange={() => {}}
            title="Select"
          />
          <span className="drag-handle" {...dragHandleProps}>
            {"\u2630"}
          </span>
        </div>
        {errorById.has(instr.id) && (
          <div className="instruction-error">
            {errorById.get(instr.id)!.message}
          </div>
        )}
      </InstructionEditContext.Provider>
    );
  }

  const dances = useMemo(() => sortedExampleDances(import.meta.env.DEV), []);

  function handleLoadDance(filename: string) {
    const entry = dances.find((d) => d.filename === filename);
    if (!entry) return;
    setInitFormation(entry.dance.initFormation);
    setInstructions(entry.dance.instructions);
  }

  return (
    <div className="command-pane">
      {dances.length > 0 && (
        <div className="dance-loader">
          <label>Load dance: </label>
          <select value="" onChange={(e) => handleLoadDance(e.target.value)}>
            <option value="" disabled>
              Select a dance...
            </option>
            {dances.map((d) => (
              <option key={d.filename} value={d.filename}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="formation-selector">
        <label>Formation: </label>
        <InlineDropdown
          options={InitFormationSchema.options}
          value={initFormation}
          onChange={(v) => setInitFormation(InitFormationSchema.parse(v))}
          getLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
      </div>

      <h2>Instructions</h2>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="instruction-list">
          <SortableContext
            id="top"
            items={instructions.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map((section, sectionIdx) => {
              let emptyGapIndex = 0;
              if (section.items.length === 0) {
                for (let si = sectionIdx - 1; si >= 0; si--) {
                  const prev = sections[si].items;
                  if (prev.length > 0) {
                    emptyGapIndex = prev[prev.length - 1].index + 1;
                    break;
                  }
                }
              }
              return (
                <Fragment key={section.label}>
                  <div className="section-header">{section.label}</div>
                  {section.items.length === 0 &&
                    renderAddGap("top", emptyGapIndex)}
                  {section.items.map((item, si) => (
                    <Fragment key={item.instruction.id}>
                      {si === 0 && renderAddGap("top", item.index)}
                      <SortableItem id={item.instruction.id}>
                        {(dragHandleProps) => (
                          <>
                            {item.instruction.type === "split" ? (
                              <div
                                className={`split-wrapper${selectedIds.has(item.instruction.id) ? " selected" : ""}`}
                              >
                                {renderInstruction(
                                  item.instruction,
                                  dragHandleProps,
                                )}
                                {renderSplitBody(item.instruction)}
                              </div>
                            ) : (
                              renderInstruction(
                                item.instruction,
                                dragHandleProps,
                              )
                            )}
                          </>
                        )}
                      </SortableItem>
                      {item.spillsOver && (
                        <div className="instruction-warning">
                          Spills into{" "}
                          {spillTargetLabel(
                            item.startBeat,
                            instructionDuration(item.instruction),
                          )}
                        </div>
                      )}
                      {renderAddGap("top", item.index + 1)}
                    </Fragment>
                  ))}
                </Fragment>
              );
            })}
          </SortableContext>
          <DropZone containerId="top" />
          {instructions.length === 0 && (
            <div className="instruction-empty">
              No instructions yet. Click + to add one.
            </div>
          )}
        </div>

        <div className="dance-info">
          <span>
            {totalBeats} beat{totalBeats !== 1 && "s"}
          </span>
          <span>
            {progression === null
              ? "Progression: <invalid>"
              : `Progression: ${progression}`}
          </span>
        </div>

        <div className="json-io">
          <button onClick={copyJson}>{copyFeedback || "Copy JSON"}</button>
          <textarea
            value=""
            onChange={() => {}}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text");
              tryLoadJson(text);
            }}
            placeholder="Paste JSON here to load"
            rows={3}
          />
          {pasteFeedback && <div className="paste-error">{pasteFeedback}</div>}
        </div>
        {activeDragId &&
          selectedIds.has(activeDragId) &&
          selectedIds.size > 1 && (
            <DragOverlay>
              <div className="drag-overlay-badge">{selectedIds.size} items</div>
            </DragOverlay>
          )}
      </DndContext>
    </div>
  );

  function renderSplitBody(split: Extract<Instruction, { type: "split" }>) {
    const [splitListA, splitListB] = splitLists(split);
    return (
      <div className="split-body">
        {(["A", "B"] as const).map((list) => {
          const subList = list === "A" ? splitListA : splitListB;
          const label = splitGroupLabel(split.by, list);
          const containerId = `split-${split.id}-${list}`;
          return (
            <div key={list} className="split-group">
              <div className="split-group-header">{label}:</div>
              <SortableContext
                id={containerId}
                items={subList.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {subList.map((sub) => (
                  <SortableItem key={sub.id} id={sub.id}>
                    {(dragHandleProps) =>
                      renderInstruction(
                        InstructionSchema.parse(sub),
                        dragHandleProps,
                        { inSplit: true },
                      )
                    }
                  </SortableItem>
                ))}
              </SortableContext>
              <DropZone containerId={containerId} />
              {renderAddGap(containerId, subList.length)}
            </div>
          );
        })}
      </div>
    );
  }
});
