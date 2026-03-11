import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";

import {
  ALL_BASE_CALLED_DIRECTIONS,
  type BaseCalledDirection,
  baseCalledDirectionFromKey,
  baseCalledDirectionToKey,
  type CalledDirection,
  pureDir,
  type PureDirection,
  towardsLabel,
  towardsPerson,
} from "../instructions/_base";
import { type Label, LabelSchema } from "../labels";
import { try_ } from "../utils";
import { Dancer } from "../worldState";
import { calledDirectionToText } from "./fieldUtils";
import { useInstructionEdit } from "./InstructionEditContext";
import { SearchableDropdown } from "./SearchableDropdown";

// ── Top-level "category" for the main dropdown ──────────────────────────

type DirectionCategory =
  | { kind: "pure"; dir: PureDirection }
  | { kind: "towards_label" }
  | { kind: "towards_person" }
  | { kind: "per_role" }
  | { kind: "per_prog_dir" };

function categoryKey(cat: DirectionCategory): string {
  switch (cat.kind) {
    case "pure":
      return `pure:${cat.dir}`;
    case "towards_label":
      return "special:towards_label";
    case "towards_person":
      return "special:towards_person";
    case "per_role":
      return "special:per_role";
    case "per_prog_dir":
      return "special:per_prog_dir";
  }
}

function categoryLabel(cat: DirectionCategory): string {
  switch (cat.kind) {
    case "pure":
      return pureDirectionLabel(cat.dir);
    case "towards_label":
      return "towards your…";
    case "towards_person":
      return "towards the person to your…";
    case "per_role":
      return "(split larks/robins)";
    case "per_prog_dir":
      return "(split ups/downs)";
  }
}

function pureDirectionLabel(dir: PureDirection): string {
  switch (dir) {
    case "on_right":
      return "right";
    case "on_left":
      return "left";
    case "in_front":
      return "forward";
    case "behind":
      return "backward";
    case "left_diagonal":
      return "left diagonal";
    case "right_diagonal":
      return "right diagonal";
    case "larks_left_robins_right":
      return "larks left / robins right";
    case "larks_right_robins_left":
      return "larks right / robins left";
    case "setclockwise":
      return "set clockwise";
    case "setcounterclockwise":
      return "set counterclockwise";
    default:
      return dir;
  }
}

function labelToShort(label: string): string {
  switch (label) {
    case "partner":
      return "your partner";
    case "neighbor":
      return "your neighbor";
    case "shadow":
      return "your shadow";
    case "opposite":
      return "your opposite";
    case "next_neighbor":
      return "your next neighbor";
    case "prev_neighbor":
      return "your prev neighbor";
    case "person_in_right_hand":
      return "person in right hand";
    case "person_in_left_hand":
      return "person in left hand";
    default:
      return label.replace(/_/g, " ");
  }
}

// ── Build categories from available options ─────────────────────────────

function buildCategories(
  options: readonly BaseCalledDirection[],
): DirectionCategory[] {
  const cats: DirectionCategory[] = [];
  const seenPure = new Set<PureDirection>();

  for (const opt of options) {
    if (opt.type === "PureDirection" && !seenPure.has(opt.dir)) {
      seenPure.add(opt.dir);
      cats.push({ kind: "pure", dir: opt.dir });
    }
  }

  if (options.some((o) => o.type === "TowardsLabel")) {
    cats.push({ kind: "towards_label" });
  }
  if (options.some((o) => o.type === "TowardsPerson")) {
    cats.push({ kind: "towards_person" });
  }

  cats.push({ kind: "per_role" });
  cats.push({ kind: "per_prog_dir" });

  return cats;
}

function categoryFromValue(value: CalledDirection): DirectionCategory {
  switch (value.type) {
    case "PureDirection":
      return { kind: "pure", dir: value.dir };
    case "TowardsLabel":
      return { kind: "towards_label" };
    case "TowardsPerson":
      return { kind: "towards_person" };
    case "PerRole":
      return { kind: "per_role" };
    case "PerProgDir":
      return { kind: "per_prog_dir" };
  }
}

// ── Label and PureDirection option lists ─────────────────────────────────

const LABEL_OPTIONS: Label[] = [...LabelSchema.options];
const PURE_DIR_OPTIONS: PureDirection[] = [
  "across",
  "out",
  "up",
  "down",
  "on_right",
  "on_left",
  "in_front",
  "behind",
  "left_diagonal",
  "right_diagonal",
  "larks_left_robins_right",
  "larks_right_robins_left",
  "setclockwise",
  "setcounterclockwise",
];

// ── Flat base direction dropdown (used in PerRole/PerProgDir sub-sections) ─

function BaseDirectionDropdown({
  options,
  value,
  onChange,
}: {
  options: readonly BaseCalledDirection[];
  value: BaseCalledDirection;
  onChange: (value: BaseCalledDirection) => void;
}) {
  const { worldState: dancerStates } = useInstructionEdit();

  const keyMap = useMemo(() => {
    const map = new Map<string, BaseCalledDirection>();
    for (const opt of options) {
      map.set(baseCalledDirectionToKey(opt), opt);
    }
    return map;
  }, [options]);

  const sortedKeys = useMemo(() => {
    const pureKeys: string[] = [];
    const otherKeys: string[] = [];
    for (const opt of options) {
      const key = baseCalledDirectionToKey(opt);
      if (opt.type === "PureDirection") pureKeys.push(key);
      else otherKeys.push(key);
    }

    if (!dancerStates) return [...pureKeys, ...otherKeys];
    const larkState = dancerStates["up_lark_0"];
    otherKeys.sort((a, b) => {
      const dirA = keyMap.get(a)!;
      const dirB = keyMap.get(b)!;
      const targetA = try_(() =>
        Dancer.get("up_lark_0", dancerStates).resolveCalledDirectionTarget(
          dirA,
        ),
      );
      if (targetA instanceof Error || !targetA) return 1;
      const targetB = try_(() =>
        Dancer.get("up_lark_0", dancerStates).resolveCalledDirectionTarget(
          dirB,
        ),
      );
      if (targetB instanceof Error || !targetB) return -1;
      const distA = larkState.pos.subtract(targetA.pos).length();
      const distB = larkState.pos.subtract(targetB.pos).length();
      if (Math.abs(distA - distB) > 1e-6) return distA - distB;
      return a < b ? -1 : 1;
    });
    return [...pureKeys, ...otherKeys];
  }, [options, dancerStates, keyMap]);

  return (
    <SearchableDropdown
      options={sortedKeys}
      value={baseCalledDirectionToKey(value)}
      getLabel={(k) => {
        const dir = keyMap.get(k);
        return dir ? calledDirectionToText(dir) : k;
      }}
      onChange={(k) => {
        const opt = keyMap.get(k);
        if (opt) onChange(opt);
        else {
          try {
            onChange(baseCalledDirectionFromKey(k));
          } catch {
            // ignore invalid keys
          }
        }
      }}
      selectOnly
    />
  );
}

// ── Main CalledDirectionEditor ──────────────────────────────────────────

export function CalledDirectionEditor({
  value,
  onChange,
  baseOptions,
}: {
  value: CalledDirection;
  onChange: (value: CalledDirection) => void;
  baseOptions?: readonly BaseCalledDirection[];
}) {
  const options = baseOptions ?? ALL_BASE_CALLED_DIRECTIONS;
  const [open, setOpen] = useState(false);
  const { onPopoverOpen } = useInstructionEdit();

  const categories = useMemo(() => buildCategories(options), [options]);
  const categoryKeys = useMemo(() => categories.map(categoryKey), [categories]);
  const categoryKeyMap = useMemo(() => {
    const map = new Map<string, DirectionCategory>();
    for (const cat of categories) {
      map.set(categoryKey(cat), cat);
    }
    return map;
  }, [categories]);

  const currentCategory = categoryFromValue(value);
  const currentCategoryKey = categoryKey(currentCategory);

  function getBaseValue(): BaseCalledDirection {
    switch (value.type) {
      case "PureDirection":
      case "TowardsLabel":
      case "TowardsPerson":
        return value;
      case "PerRole":
        return value.larks;
      case "PerProgDir":
        return value.ups;
    }
  }

  function handleCategoryChange(key: string) {
    const cat = categoryKeyMap.get(key);
    if (!cat) return;

    switch (cat.kind) {
      case "pure":
        onChange(pureDir(cat.dir));
        break;
      case "towards_label":
        if (value.type === "TowardsLabel") break;
        onChange(towardsLabel("partner"));
        break;
      case "towards_person":
        if (value.type === "TowardsPerson") break;
        onChange(towardsPerson("across"));
        break;
      case "per_role": {
        if (value.type === "PerRole") break;
        const base = getBaseValue();
        onChange({ type: "PerRole", larks: base, robins: base });
        break;
      }
      case "per_prog_dir": {
        if (value.type === "PerProgDir") break;
        const base = getBaseValue();
        onChange({ type: "PerProgDir", ups: base, downs: base });
        break;
      }
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) onPopoverOpen?.();
  }

  const displayText = calledDirectionToText(value);

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <span
          className="inline-value"
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOpenChange(!open);
            }
          }}
        >
          {displayText}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="popover-content"
          sideOffset={4}
          align="start"
        >
          <div className="popover-section-group">
            <SearchableDropdown
              options={categoryKeys}
              value={currentCategoryKey}
              getLabel={(k) => {
                const cat = categoryKeyMap.get(k);
                return cat ? categoryLabel(cat) : k;
              }}
              onChange={handleCategoryChange}
              onCommit={() => {
                // Close if user selected a pure direction (no sub-options needed)
                if (value.type === "PureDirection") setOpen(false);
              }}
              selectOnly
            />

            {value.type === "TowardsLabel" && (
              <div className="popover-sub-section">
                <div className="popover-sub-row">
                  <span className="popover-sub-label">label:</span>
                  <SearchableDropdown
                    options={LABEL_OPTIONS}
                    value={value.label}
                    getLabel={labelToShort}
                    onChange={(label) =>
                      onChange(towardsLabel(LabelSchema.parse(label)))
                    }
                    onCommit={() => {}}
                    selectOnly
                  />
                </div>
              </div>
            )}

            {value.type === "TowardsPerson" && (
              <div className="popover-sub-section">
                <div className="popover-sub-row">
                  <span className="popover-sub-label">roughly:</span>
                  <SearchableDropdown
                    options={PURE_DIR_OPTIONS}
                    value={value.roughDir}
                    getLabel={pureDirectionLabel}
                    onChange={(dir) =>
                      onChange(towardsPerson(dir satisfies PureDirection))
                    }
                    onCommit={() => {}}
                    selectOnly
                  />
                </div>
              </div>
            )}

            {value.type === "PerRole" && (
              <div className="popover-sub-section">
                <div className="popover-sub-row">
                  <span className="popover-sub-label">larks:</span>
                  <BaseDirectionDropdown
                    options={options}
                    value={value.larks}
                    onChange={(larks) => onChange({ ...value, larks })}
                  />
                </div>
                <div className="popover-sub-row">
                  <span className="popover-sub-label">robins:</span>
                  <BaseDirectionDropdown
                    options={options}
                    value={value.robins}
                    onChange={(robins) => onChange({ ...value, robins })}
                  />
                </div>
              </div>
            )}

            {value.type === "PerProgDir" && (
              <div className="popover-sub-section">
                <div className="popover-sub-row">
                  <span className="popover-sub-label">ups:</span>
                  <BaseDirectionDropdown
                    options={options}
                    value={value.ups}
                    onChange={(ups) => onChange({ ...value, ups })}
                  />
                </div>
                <div className="popover-sub-row">
                  <span className="popover-sub-label">downs:</span>
                  <BaseDirectionDropdown
                    options={options}
                    value={value.downs}
                    onChange={(downs) => onChange({ ...value, downs })}
                  />
                </div>
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
