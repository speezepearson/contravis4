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
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";

import {
  contradbInstructionFrequencies,
  sortedExampleDances,
} from "../exampleDances";
import type { GenerateError } from "../generate";
import { inferProgression } from "../inferProgression";
import type { ContraAnimation } from "../instructions/_base";
import type { InitFormation, Instruction } from "../instructions/index";
import {
  InitFormationNameSchema,
  instructionDuration,
  InstructionSchema,
  resolveInitFormation,
} from "../instructions/index";
import type { Split } from "../instructions/split";
import { SplitSubInstructionSchema } from "../instructions/split";
import { type SnazzyError, type SnazzySegment } from "../snazzyError";
import { assertNever, buildEnumRecord, indexOf } from "../utils";
import { type WorldState } from "../worldState";
import { AllemandeFields } from "./fields/AllemandeFields";
import { BalanceAndSwingFields } from "./fields/BalanceAndSwingFields";
import { BalanceFields } from "./fields/BalanceFields";
import { BalanceTheRingFields } from "./fields/BalanceTheRingFields";
import { BendTheLineFields } from "./fields/BendTheLineFields";
import { BoxCirculateFields } from "./fields/BoxCirculateFields";
import { BoxTheGnatFields } from "./fields/BoxTheGnatFields";
import { CaliforniaTwirlFields } from "./fields/CaliforniaTwirlFields";
import { RobinsChainFields } from "./fields/ChainFields";
import { CircleFields } from "./fields/CircleFields";
import { DoSiDoFields } from "./fields/DoSiDoFields";
import { DownTheHallFields } from "./fields/DownTheHallFields";
import { DropHandsFields } from "./fields/DropHandsFields";
import { FaceFields } from "./fields/FaceFields";
import { FormLongWavesFields } from "./fields/FormLongWavesFields";
import { FormShortWavesFields } from "./fields/FormShortWavesFields";
import { GiveAndTakeIntoSwingFields } from "./fields/GiveAndTakeIntoSwingFields";
import { GreetNewNeighborsFields } from "./fields/GreetNewNeighbors";
import { GreetShadowFields } from "./fields/GreetShadow";
import { HeyFields } from "./fields/HeyFields";
import { LongLineInCenterFields } from "./fields/LongLineInCenterFields";
import { LongLinesForwardBackFields } from "./fields/LongLinesForwardBackFields";
import { MadRobinFields } from "./fields/MadRobinFields";
import { MeltdownSwingFields } from "./fields/MeltdownSwingFields";
import { OrbitFields } from "./fields/OrbitFields";
import { PassByFields } from "./fields/PassByFields";
import { PetronellaFields } from "./fields/PetronellaFields";
import { PoussetteFields } from "./fields/PoussetteFields";
import { PullByFields } from "./fields/PullByFields";
import { RightLeftThroughFields } from "./fields/RightLeftThroughFields";
import { RollAwayFields } from "./fields/RollAwayFields";
import { RoryOMoreFields } from "./fields/RoryOMoreFields";
import { ShoulderRoundFields } from "./fields/ShoulderRoundFields";
import { SingleFilePromenadeFields } from "./fields/SingleFilePromenadeFields";
import { SliceFields } from "./fields/SliceFields";
import { SplitFields } from "./fields/SplitFields";
import { SquareThroughFields } from "./fields/SquareThroughFields";
import { StarFields } from "./fields/StarFields";
import { StepFields } from "./fields/StepFields";
import { SwingFields } from "./fields/SwingFields";
import { TakeHandsFields } from "./fields/TakeHandsFields";
import { TakeHandsInRingsFields } from "./fields/TakeHandsInRingsFields";
import { TurnAloneFields } from "./fields/TurnAloneFields";
import { TurnAsACoupleFields } from "./fields/TurnAsACoupleFields";
import { UpTheHallFields } from "./fields/UpTheHallFields";
import { ZigZagFields } from "./fields/ZigZagFields";
import { calledIdentifierToText, makeDefaultInstruction } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";
import { InlineNumber } from "./InlineNumber";
import { InstructionEditContext } from "./InstructionEditContext";
import {
  assignId,
  assignIds,
  type InstructionId,
  InstructionIdSchema,
  type InstructionWithId,
  splitListsWithId,
  type SplitSubInstructionWithId,
  type SplitWithId,
} from "./instructionId";
import {
  CalledIdentifierHighlightContext,
  DancerHighlightContext,
} from "./RelationshipHighlightContext";
import { groupIntoSections, spillTargetLabel } from "./sectionGrouping";

function SnazzyErrorMessage({ segments }: { segments: SnazzySegment[] }) {
  const highlightRel = useContext(CalledIdentifierHighlightContext);
  const highlightDancer = useContext(DancerHighlightContext);

  return (
    <>
      {segments.map((seg, i) => {
        if (typeof seg === "string") return <Fragment key={i}>{seg}</Fragment>;
        if ("dancerId" in seg) {
          return (
            <span
              key={i}
              className="snazzy-dancer"
              onMouseEnter={() => highlightDancer(seg.dancerId)}
              onMouseLeave={() => highlightDancer(null)}
            >
              {seg.dancerId}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="snazzy-cid"
            onMouseEnter={() => highlightRel(seg.cid)}
            onMouseLeave={() => highlightRel(null)}
          >
            {calledIdentifierToText(seg.cid)}
          </span>
        );
      })}
    </>
  );
}

const ActionOptionTypeSchema = z.enum([
  "allemande",
  "balance",
  "balance_and_swing",
  "balance_the_ring",
  "bend_the_line",
  "box_circulate",
  "box_the_gnat",
  "california_twirl",
  "robins_chain",
  "circle",
  "do_si_do",
  "down_the_hall",
  "drop_hands",
  "face",
  "form_long_waves",
  "form_short_waves",
  "give_and_take_into_swing",
  "greet_new_neighbors",
  "hey",
  "greet_shadow",
  "long_line_in_center",
  "long_lines_forward_back",
  "mad_robin",
  "meltdown_swing",
  "orbit",
  "pass_by",
  "petronella",
  "poussette",
  "pull_by",
  "right_left_through",
  "roll_away",
  "rory_o_more",
  "shoulder_round",
  "single_file_promenade",
  "slice",
  "square_through",
  "star",
  "split",
  "step",
  "swing",
  "take_hands_in_rings",
  "take_hands",
  "turn_alone",
  "turn_as_a_couple",
  "up_the_hall",
  "zig_zag",
]);
export type ActionOptionType = z.infer<typeof ActionOptionTypeSchema>;
export const ACTION_OPTION_TYPES = ActionOptionTypeSchema.options
  .sort((a, b) => {
    const freqA = contradbInstructionFrequencies.get(a) ?? 0;
    const freqB = contradbInstructionFrequencies.get(b) ?? 0;
    if (freqA !== freqB) return freqB - freqA;
    return a.localeCompare(b);
  })
  .reduce<ActionOptionType[]>((acc, type) => {
    // "drop_hands" goes right after "take_hands"; "greet_new_neighbors" goes at the end.
    if (type === "drop_hands" || type === "greet_new_neighbors") return acc;
    acc.push(type);
    if (type === "take_hands") acc.push("drop_hands");
    return acc;
  }, [])
  .concat("greet_new_neighbors");

const ACTION_LABELS = buildEnumRecord(ActionOptionTypeSchema, (t) => {
  switch (t) {
    case "allemande":
      return "allemande";
    case "balance":
      return "balance";
    case "balance_and_swing":
      return "balance & swing";
    case "balance_the_ring":
      return "balance the ring";
    case "bend_the_line":
      return "bend the line";
    case "box_circulate":
      return "box circulate";
    case "box_the_gnat":
      return "box the gnat";
    case "california_twirl":
      return "California twirl";
    case "robins_chain":
      return "robins chain";
    case "circle":
      return "circle";
    case "do_si_do":
      return "do si do";
    case "down_the_hall":
      return "down the hall";
    case "drop_hands":
      return "drop hands";
    case "face":
      return "face";
    case "form_long_waves":
      return "form long waves";
    case "form_short_waves":
      return "form short waves";
    case "give_and_take_into_swing":
      return "give & take";
    case "hey":
      return "hey";
    case "long_line_in_center":
      return "long line in center";
    case "long_lines_forward_back":
      return "long lines forward & back";
    case "mad_robin":
      return "mad robin";
    case "meltdown_swing":
      return "meltdown swing";
    case "orbit":
      return "orbit";
    case "pass_by":
      return "pass by";
    case "petronella":
      return "petronella";
    case "poussette":
      return "poussette";
    case "pull_by":
      return "pull by";
    case "greet_new_neighbors":
      return "greet new neighbors";
    case "greet_shadow":
      return "greet shadow";
    case "right_left_through":
      return "right & left through";
    case "roll_away":
      return "roll away";
    case "rory_o_more":
      return "Rory O'More";
    case "shoulder_round":
      return "shoulder round";
    case "single_file_promenade":
      return "single file promenade";
    case "slice":
      return "slice";
    case "square_through":
      return "square through";
    case "star":
      return "star";
    case "split":
      return "split";
    case "step":
      return "step";
    case "swing":
      return "swing";
    case "take_hands_in_rings":
      return "take hands in rings";
    case "take_hands":
      return "take hands";
    case "turn_alone":
      return "turn alone";
    case "turn_as_a_couple":
      return "turn as a couple";
    case "up_the_hall":
      return "up the hall";
    case "zig_zag":
      return "zig zag";
  }

  assertNever(t);
});

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

function instructionContainsId(
  instr: InstructionWithId,
  id: InstructionId,
): boolean {
  if (instr.id === id) return true;
  if (instr.type === "split") {
    const [listA, listB] = splitListsWithId(instr);
    return [...listA, ...listB].some((c) => c.id === id);
  }
  return false;
}

function rebuildSplit(
  split: SplitWithId,
  listA: SplitSubInstructionWithId[],
  listB: SplitSubInstructionWithId[],
): SplitWithId {
  if (split.by === "role") {
    return { ...split, larks: listA, robins: listB };
  }
  return { ...split, ups: listA, downs: listB };
}

function removeFromTree(
  instrs: InstructionWithId[],
  targetId: InstructionId,
): [InstructionWithId[], InstructionWithId | null] {
  const topIdx = instrs.findIndex((i) => i.id === targetId);
  if (topIdx !== -1) {
    return [
      [...instrs.slice(0, topIdx), ...instrs.slice(topIdx + 1)],
      instrs[topIdx],
    ];
  }
  let removed: InstructionWithId | null = null;
  const mapped = instrs.map((i): InstructionWithId => {
    if (removed) return i;
    if (i.type === "split") {
      const [listA, listB] = splitListsWithId(i);
      const aIdx = listA.findIndex((s) => s.id === targetId);
      if (aIdx !== -1) {
        removed = { ...listA[aIdx], id: listA[aIdx].id };
        return rebuildSplit(
          i,
          [...listA.slice(0, aIdx), ...listA.slice(aIdx + 1)],
          listB,
        );
      }
      const bIdx = listB.findIndex((s) => s.id === targetId);
      if (bIdx !== -1) {
        removed = { ...listB[bIdx], id: listB[bIdx].id };
        return rebuildSplit(i, listA, [
          ...listB.slice(0, bIdx),
          ...listB.slice(bIdx + 1),
        ]);
      }
    }
    return i;
  });
  return [mapped, removed];
}

function toSubInstruction(item: InstructionWithId): SplitSubInstructionWithId {
  const sub = SplitSubInstructionSchema.parse(item);
  return { ...sub, id: item.id };
}

function insertIntoContainer(
  instrs: InstructionWithId[],
  containerId: string,
  item: InstructionWithId,
  index: number,
): InstructionWithId[] {
  const parsed = parseContainerId(containerId);
  if (parsed.type === "top") {
    const copy = [...instrs];
    copy.splice(index, 0, item);
    return copy;
  }
  return instrs.map((i): InstructionWithId => {
    if (i.type === "split" && i.id === parsed.splitId) {
      const [listA, listB] = splitListsWithId(i);
      const list = parsed.list === "A" ? listA : listB;
      const copy = [...list];
      copy.splice(index, 0, toSubInstruction(item));
      return parsed.list === "A"
        ? rebuildSplit(i, copy, listB)
        : rebuildSplit(i, listA, copy);
    }
    return i;
  });
}

function reorderInContainer(
  instrs: InstructionWithId[],
  containerId: string,
  oldIndex: number,
  newIndex: number,
): InstructionWithId[] {
  const parsed = parseContainerId(containerId);
  if (parsed.type === "top") return arrayMove(instrs, oldIndex, newIndex);
  return instrs.map((i): InstructionWithId => {
    if (i.type === "split" && i.id === parsed.splitId) {
      const [listA, listB] = splitListsWithId(i);
      return parsed.list === "A"
        ? rebuildSplit(i, arrayMove(listA, oldIndex, newIndex), listB)
        : rebuildSplit(i, listA, arrayMove(listB, oldIndex, newIndex));
    }
    return i;
  });
}

function getContainerItems(
  instrs: InstructionWithId[],
  containerId: string,
): InstructionWithId[] | null {
  const parsed = parseContainerId(containerId);
  if (parsed.type === "top") return instrs;
  for (const i of instrs) {
    if (i.type === "split" && i.id === parsed.splitId) {
      const [listA, listB] = splitListsWithId(i);
      const subs = parsed.list === "A" ? listA : listB;
      return subs.map((s) => ({ ...s, id: s.id }));
    }
  }
  return null;
}

function replaceInTree(
  instrs: InstructionWithId[],
  id: InstructionId,
  replacement: InstructionWithId,
): InstructionWithId[] {
  return instrs.map((i): InstructionWithId => {
    if (i.id === id) return replacement;
    if (i.type === "split") {
      const [listA, listB] = splitListsWithId(i);
      if (!listA.some((s) => s.id === id) && !listB.some((s) => s.id === id))
        return i;
      return rebuildSplit(
        i,
        listA.map((sub) =>
          sub.id === id ? toSubInstruction(replacement) : sub,
        ),
        listB.map((sub) =>
          sub.id === id ? toSubInstruction(replacement) : sub,
        ),
      );
    }
    return i;
  });
}

function flatInstructionIds(instrs: InstructionWithId[]): InstructionId[] {
  const ids: InstructionId[] = [];
  for (const i of instrs) {
    ids.push(i.id);
    if (i.type === "split") {
      const [listA, listB] = splitListsWithId(i);
      for (const s of listA) ids.push(s.id);
      for (const s of listB) ids.push(s.id);
    }
  }
  return ids;
}

function removeMultipleFromTop(
  instrs: InstructionWithId[],
  ids: Set<InstructionId>,
): [InstructionWithId[], InstructionWithId[]] {
  const remaining: InstructionWithId[] = [];
  const removed: InstructionWithId[] = [];
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
  instructions: InstructionWithId[];
  setInstructions: (instructions: InstructionWithId[]) => void;
  initFormation: InitFormation;
  setInitFormation: (formation: InitFormation) => void;
  name: string;
  setName: (name: string) => void;
  author: string;
  setAuthor: (author: string) => void;
  setDanceState: (state: {
    instructions: InstructionWithId[];
    initFormation: InitFormation;
    name: string;
    author: string;
  }) => void;
  activeId: InstructionId | null;
  generateErrors: GenerateError[];
  warningsById: Map<InstructionId, { beat: number; warnings: SnazzyError[] }>;
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

function doesRequireBeatsInput(
  type: Exclude<Instruction["type"], "split">,
): boolean {
  switch (type) {
    case "allemande":
    case "balance":
    case "balance_and_swing":
    case "balance_the_ring":
    case "bend_the_line":
    case "box_circulate":
    case "box_the_gnat":
    case "california_twirl":
    case "robins_chain":
    case "circle":
    case "do_si_do":
    case "down_the_hall":
    case "give_and_take_into_swing":
    case "hey":
    case "long_line_in_center":
    case "long_lines_forward_back":
    case "mad_robin":
    case "meltdown_swing":
    case "orbit":
    case "pass_by":
    case "petronella":
    case "poussette":
    case "pull_by":
    case "right_left_through":
    case "roll_away":
    case "rory_o_more":
    case "shoulder_round":
    case "single_file_promenade":
    case "slice":
    case "square_through":
    case "star":
    case "step":
    case "swing":
    case "turn_alone":
    case "turn_as_a_couple":
    case "up_the_hall":
    case "zig_zag":
      return true;
    case "drop_hands":
    case "face":
    case "form_long_waves":
    case "form_short_waves":
    case "greet_new_neighbors":
    case "greet_shadow":
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
  const currentBeats = instruction.type !== "split" ? instruction.beats : 0;

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
  const [valid, setValid] = useState(true);

  const actionOptions = allowContainers
    ? ActionOptionTypeSchema.options
    : ActionOptionTypeSchema.options.filter((o) => o !== "split");

  const actionOptionValue: ActionOptionType = instruction.type;

  function handleActionChange(newAction: ActionOptionType) {
    if (newAction !== actionOptionValue) {
      onChange(makeDefaultInstruction(newAction));
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
        options={actionOptions}
        value={actionOptionValue}
        onChange={(v) => handleActionChange(v)}
        getLabel={(v) => ACTION_LABELS[v] ?? v}
        autoFocus={autoFocusAction}
      />{" "}
      {(() => {
        switch (instruction.type) {
          case "allemande":
            return <AllemandeFields {...common} instruction={instruction} />;
          case "balance":
            return <BalanceFields {...common} instruction={instruction} />;
          case "balance_and_swing":
            return (
              <BalanceAndSwingFields {...common} instruction={instruction} />
            );
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
          case "robins_chain":
            return <RobinsChainFields {...common} instruction={instruction} />;
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
          case "greet_new_neighbors":
            return (
              <GreetNewNeighborsFields {...common} instruction={instruction} />
            );
          case "hey":
            return <HeyFields {...common} instruction={instruction} />;
          case "greet_shadow":
            return <GreetShadowFields {...common} instruction={instruction} />;
          case "long_line_in_center":
            return (
              <LongLineInCenterFields {...common} instruction={instruction} />
            );
          case "long_lines_forward_back":
            return (
              <LongLinesForwardBackFields
                {...common}
                instruction={instruction}
              />
            );
          case "mad_robin":
            return <MadRobinFields {...common} instruction={instruction} />;
          case "meltdown_swing":
            return (
              <MeltdownSwingFields {...common} instruction={instruction} />
            );
          case "orbit":
            return <OrbitFields {...common} instruction={instruction} />;
          case "pass_by":
            return <PassByFields {...common} instruction={instruction} />;
          case "petronella":
            return <PetronellaFields {...common} instruction={instruction} />;
          case "poussette":
            return <PoussetteFields {...common} instruction={instruction} />;
          case "pull_by":
            return <PullByFields {...common} instruction={instruction} />;
          case "right_left_through":
            return (
              <RightLeftThroughFields {...common} instruction={instruction} />
            );
          case "roll_away":
            return <RollAwayFields {...common} instruction={instruction} />;
          case "rory_o_more":
            return <RoryOMoreFields {...common} instruction={instruction} />;
          case "slice":
            return <SliceFields {...common} instruction={instruction} />;
          case "shoulder_round":
            return (
              <ShoulderRoundFields {...common} instruction={instruction} />
            );
          case "square_through":
            return (
              <SquareThroughFields {...common} instruction={instruction} />
            );
          case "single_file_promenade":
            return (
              <SingleFilePromenadeFields
                {...common}
                instruction={instruction}
              />
            );
          case "star":
            return <StarFields {...common} instruction={instruction} />;
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
          case "turn_alone":
            return <TurnAloneFields {...common} instruction={instruction} />;
          case "turn_as_a_couple":
            return (
              <TurnAsACoupleFields {...common} instruction={instruction} />
            );
          case "bend_the_line":
            return <BendTheLineFields {...common} instruction={instruction} />;
          case "down_the_hall":
            return <DownTheHallFields {...common} instruction={instruction} />;
          case "up_the_hall":
            return <UpTheHallFields {...common} instruction={instruction} />;
          case "zig_zag":
            return <ZigZagFields {...common} instruction={instruction} />;
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
  name,
  setName,
  author,
  setAuthor,
  setDanceState,
  activeId,
  generateErrors,
  warningsById,
  animation,
  onHoverInstruction,
  onEditInstruction,
  onSkipToInstruction,
}: Props) {
  const [newlyAddedId, setNewlyAddedId] = useState<InstructionId | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<InstructionId>>(new Set());
  const [activeDragId, setActiveDragId] = useState<InstructionId | null>(null);
  const lastClickedIdRef = useRef<InstructionId | null>(null);
  const lastClickWasSelectRef = useRef(true);
  const rememberedAuthorRef = useRef("");

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
    const result = new Map<InstructionId, WorldState>();
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
        const [listA, listB] = splitListsWithId(instr);
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
    return inferProgression(animation, resolveInitFormation(initFormation));
  }, [animation, initFormation]);

  const handleCheckboxClick = useCallback(
    (id: InstructionId, event: React.MouseEvent) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (event.shiftKey && lastClickedIdRef.current) {
          const lastIdx = indexOf(allFlatIds, lastClickedIdRef.current);
          const curIdx = indexOf(allFlatIds, id);
          if (lastIdx !== undefined && curIdx !== undefined) {
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
    const refToId = new Map<Instruction, InstructionId>();
    for (const instr of instructions) {
      refToId.set(instr, instr.id);
    }
    const map = new Map<InstructionId, GenerateError>();
    for (const err of generateErrors) {
      const id = refToId.get(err.instruction);
      if (id !== undefined) map.set(id, err);
    }
    return map;
  }, [generateErrors, instructions]);

  function handleChange(id: InstructionId, updated: Instruction) {
    const withId = assignId(updated);
    setInstructions(replaceInTree(instructions, id, { ...withId, id }));
  }

  function handleAdd(containerId: string, index: number) {
    const defaultInstr = assignId(makeDefaultInstruction("balance"));
    const newInstructions = insertIntoContainer(
      instructions,
      containerId,
      defaultInstr,
      index,
    );
    setInstructions(newInstructions);
    setNewlyAddedId(defaultInstr.id);
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
    instr: InstructionWithId,
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
          worldState: dancerStatesById.get(instr.id),
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
            <SnazzyErrorMessage segments={errorById.get(instr.id)!.segments} />
          </div>
        )}
        {warningsById.has(instr.id) && (
          <div className="instruction-warning">
            <span className="instruction-warning-beat">
              {"t=" + warningsById.get(instr.id)!.beat.toFixed(2)}
            </span>
            {warningsById.get(instr.id)!.warnings.map((warning, i) => (
              <div key={i}>
                <SnazzyErrorMessage segments={warning.segments} />
              </div>
            ))}
          </div>
        )}
      </InstructionEditContext.Provider>
    );
  }

  const dances = useMemo(() => sortedExampleDances(import.meta.env.DEV), []);

  function handleClear() {
    setDanceState({
      initFormation: "improper",
      instructions: [],
      name: "",
      author: rememberedAuthorRef.current,
    });
  }

  function handleLoadDance(filename: string) {
    const entry = dances.find((d) => d.filename === filename);
    if (!entry) return;
    setDanceState({
      initFormation: entry.dance.initFormation,
      instructions: assignIds(entry.dance.instructions),
      name: entry.dance.name ?? "",
      author: entry.dance.author ?? "",
    });
  }

  return (
    <div className="command-pane">
      {dances.length > 0 && (
        <div className="dance-loader">
          <label>Load example dance: </label>
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

      <div className="dance-metadata">
        <label>
          Name:{" "}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dance name"
          />
        </label>
        <label>
          Author:{" "}
          <input
            type="text"
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value);
              rememberedAuthorRef.current = e.target.value;
            }}
            placeholder="Choreographer"
          />
        </label>
      </div>

      <div className="formation-selector">
        <label>Formation: </label>
        <InlineDropdown
          options={InitFormationNameSchema.options}
          value={typeof initFormation === "string" ? initFormation : "improper"}
          onChange={(v) => setInitFormation(InitFormationNameSchema.parse(v))}
          getLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
      </div>

      <h2>
        Instructions <button onClick={handleClear}>clear</button>
      </h2>

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
            {sections.map((section) => {
              if (section.items.length === 0) return null;
              return (
                <Fragment key={section.label}>
                  <div className="section-header">{section.label}</div>
                  {section.items.map((item, si) => {
                    const isLastInSection = si === section.items.length - 1;
                    const isLastOverall =
                      item.index === instructions.length - 1;
                    return (
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
                        {(!isLastInSection || isLastOverall) &&
                          renderAddGap("top", item.index + 1)}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </SortableContext>
          <DropZone containerId="top" />
          {instructions.length === 0 && (
            <>
              {renderAddGap("top", 0)}
              <div className="instruction-empty">
                No instructions yet. Click + to add one.
              </div>
            </>
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

  function renderSplitBody(split: SplitWithId) {
    const [splitListA, splitListB] = splitListsWithId(split);
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
                        { ...sub, id: sub.id },
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
