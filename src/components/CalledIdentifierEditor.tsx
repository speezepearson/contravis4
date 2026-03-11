import * as Popover from "@radix-ui/react-popover";
import { useContext, useMemo, useState } from "react";

import {
  ALL_BASE_CALLED_IDENTIFIERS,
  type BaseCalledIdentifier,
  baseCalledIdentifierFromKey,
  baseCalledIdentifierToKey,
  type CalledIdentifier,
  labelId,
  type OnlyRole,
  personInDir,
  type PureDirection,
} from "../instructions/_base";
import { LabelSchema } from "../labels";
import { try_ } from "../utils";
import { Dancer } from "../worldState";
import { calledIdentifierToText } from "./fieldUtils";
import { useInstructionEdit } from "./InstructionEditContext";
import { CalledIdentifierHighlightContext } from "./RelationshipHighlightContext";
import { SearchableDropdown } from "./SearchableDropdown";

// ── Top-level "category" for the main dropdown ──────────────────────────

type IdentifierCategory =
  | { kind: "label"; label: string }
  | { kind: "person_in_direction" }
  | { kind: "per_role" }
  | { kind: "per_prog_dir" };

function categoryKey(cat: IdentifierCategory): string {
  switch (cat.kind) {
    case "label":
      return `label:${cat.label}`;
    case "person_in_direction":
      return "special:person_in_direction";
    case "per_role":
      return "special:per_role";
    case "per_prog_dir":
      return "special:per_prog_dir";
  }
}

function categoryLabel(cat: IdentifierCategory): string {
  switch (cat.kind) {
    case "label":
      return labelToShort(cat.label);
    case "person_in_direction":
      return "the person to your…";
    case "per_role":
      return "(split larks/robins)";
    case "per_prog_dir":
      return "(split ups/downs)";
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
  options: readonly BaseCalledIdentifier[],
): IdentifierCategory[] {
  const cats: IdentifierCategory[] = [];
  const seenLabels = new Set<string>();

  for (const opt of options) {
    if (opt.type === "label" && !seenLabels.has(opt.label)) {
      seenLabels.add(opt.label);
      cats.push({ kind: "label", label: opt.label });
    }
  }

  if (options.some((o) => o.type === "PersonInDirection")) {
    cats.push({ kind: "person_in_direction" });
  }

  // Always offer split options (they apply on top of base options)
  cats.push({ kind: "per_role" });
  cats.push({ kind: "per_prog_dir" });

  return cats;
}

function categoryFromValue(value: CalledIdentifier): IdentifierCategory {
  switch (value.type) {
    case "label":
      return { kind: "label", label: value.label };
    case "PersonInDirection":
      return { kind: "person_in_direction" };
    case "PerRole":
      return { kind: "per_role" };
    case "PerProgDir":
      return { kind: "per_prog_dir" };
  }
}

// ── PureDirection options for the sub-dropdown ──────────────────────────

const PURE_DIRECTION_OPTIONS: PureDirection[] = [
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

function pureDirectionLabel(dir: PureDirection): string {
  switch (dir) {
    case "on_right":
      return "right";
    case "on_left":
      return "left";
    case "in_front":
      return "in front";
    case "behind":
      return "behind";
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

const ONLY_ROLE_OPTIONS: OnlyRole[] = ["different", "same"];

function onlyRoleLabel(role: OnlyRole): string {
  return role === "different" ? "different role" : "same role";
}

// ── Flat base identifier dropdown (used in PerRole/PerProgDir sub-sections) ─

function BaseIdentifierDropdown({
  options,
  value,
  onChange,
  onInvalid,
}: {
  options: readonly BaseCalledIdentifier[];
  value: BaseCalledIdentifier;
  onChange: (value: BaseCalledIdentifier) => void;
  onInvalid?: () => void;
}) {
  const highlightRelationship = useContext(CalledIdentifierHighlightContext);
  const { worldState: dancerStates } = useInstructionEdit();

  const keyMap = useMemo(() => {
    const map = new Map<string, BaseCalledIdentifier>();
    for (const opt of options) {
      map.set(baseCalledIdentifierToKey(opt), opt);
    }
    return map;
  }, [options]);

  const sortedKeys = useMemo(() => {
    const keys = options.map(baseCalledIdentifierToKey);
    if (!dancerStates) return keys;
    const larkState = dancerStates["up_lark_0"];
    return [...keys].sort((a, b) => {
      const cidA = keyMap.get(a)!;
      const cidB = keyMap.get(b)!;
      const targetA = try_(() =>
        Dancer.get("up_lark_0", dancerStates).resolveCalledIdentifier(cidA),
      );
      if (targetA instanceof Error || !targetA) return 1;
      const targetB = try_(() =>
        Dancer.get("up_lark_0", dancerStates).resolveCalledIdentifier(cidB),
      );
      if (targetB instanceof Error || !targetB) return -1;
      const distA = larkState.pos.subtract(targetA.pos).length();
      const distB = larkState.pos.subtract(targetB.pos).length();
      if (Math.abs(distA - distB) > 1e-6) return distA - distB;
      return a < b ? -1 : 1;
    });
  }, [options, dancerStates, keyMap]);

  return (
    <SearchableDropdown
      options={sortedKeys}
      value={baseCalledIdentifierToKey(value)}
      getLabel={(k) => {
        const cid = keyMap.get(k);
        return cid ? calledIdentifierToText(cid) : k;
      }}
      onChange={(k) => {
        const opt = keyMap.get(k);
        if (opt) onChange(opt);
        else {
          try {
            onChange(baseCalledIdentifierFromKey(k));
          } catch {
            onInvalid?.();
          }
        }
      }}
      onHighlight={(k) => {
        if (!k) {
          highlightRelationship(null);
          return;
        }
        const cid = keyMap.get(k);
        if (cid) highlightRelationship(cid);
      }}
      selectOnly
    />
  );
}

// ── Main CalledIdentifierEditor ─────────────────────────────────────────

export function CalledIdentifierEditor({
  value,
  onChange,
  baseOptions,
  onInvalid,
}: {
  value: CalledIdentifier;
  onChange: (value: CalledIdentifier) => void;
  baseOptions?: readonly BaseCalledIdentifier[];
  onInvalid?: () => void;
}) {
  const options = baseOptions ?? ALL_BASE_CALLED_IDENTIFIERS;
  const [open, setOpen] = useState(false);
  const { onPopoverOpen } = useInstructionEdit();
  const highlightRelationship = useContext(CalledIdentifierHighlightContext);

  const categories = useMemo(() => buildCategories(options), [options]);
  const categoryKeys = useMemo(() => categories.map(categoryKey), [categories]);
  const categoryKeyMap = useMemo(() => {
    const map = new Map<string, IdentifierCategory>();
    for (const cat of categories) {
      map.set(categoryKey(cat), cat);
    }
    return map;
  }, [categories]);

  // Filter PureDirection options to only those available in baseOptions
  const availablePureDirs = useMemo(() => {
    const dirs = new Set<PureDirection>();
    for (const opt of options) {
      if (opt.type === "PersonInDirection") dirs.add(opt.dir);
    }
    return dirs.size > 0
      ? PURE_DIRECTION_OPTIONS.filter((d) => dirs.has(d))
      : PURE_DIRECTION_OPTIONS;
  }, [options]);

  const currentCategory = categoryFromValue(value);
  const currentCategoryKey = categoryKey(currentCategory);

  function getBaseValue(): BaseCalledIdentifier {
    switch (value.type) {
      case "label":
      case "PersonInDirection":
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
      case "label":
        onChange(labelId(LabelSchema.parse(cat.label)));
        break;
      case "person_in_direction":
        if (value.type === "PersonInDirection") break;
        onChange(personInDir("across", "different"));
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
    if (!v) highlightRelationship(null);
  }

  const displayText = calledIdentifierToText(value);

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
          onMouseEnter={() => {
            if (value.type === "label" || value.type === "PersonInDirection") {
              highlightRelationship(value);
            }
          }}
          onMouseLeave={() => highlightRelationship(null)}
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
                // Close if user selected a simple label (no sub-options needed)
                if (value.type === "label") setOpen(false);
              }}
              selectOnly
            />

            {value.type === "PersonInDirection" && (
              <div className="popover-sub-section">
                <div className="popover-sub-row">
                  <span className="popover-sub-label">direction:</span>
                  <SearchableDropdown
                    options={availablePureDirs}
                    value={value.dir}
                    getLabel={pureDirectionLabel}
                    onChange={(dir) =>
                      onChange({ ...value, dir: dir satisfies PureDirection })
                    }
                    onCommit={() => {}}
                    selectOnly
                  />
                </div>
                <div className="popover-sub-row">
                  <span className="popover-sub-label">role filter:</span>
                  <SearchableDropdown
                    options={ONLY_ROLE_OPTIONS}
                    value={value.onlyRole}
                    getLabel={onlyRoleLabel}
                    onChange={(role) =>
                      onChange({ ...value, onlyRole: role satisfies OnlyRole })
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
                  <BaseIdentifierDropdown
                    options={options}
                    value={value.larks}
                    onChange={(larks) => onChange({ ...value, larks })}
                    onInvalid={onInvalid}
                  />
                </div>
                <div className="popover-sub-row">
                  <span className="popover-sub-label">robins:</span>
                  <BaseIdentifierDropdown
                    options={options}
                    value={value.robins}
                    onChange={(robins) => onChange({ ...value, robins })}
                    onInvalid={onInvalid}
                  />
                </div>
              </div>
            )}

            {value.type === "PerProgDir" && (
              <div className="popover-sub-section">
                <div className="popover-sub-row">
                  <span className="popover-sub-label">ups:</span>
                  <BaseIdentifierDropdown
                    options={options}
                    value={value.ups}
                    onChange={(ups) => onChange({ ...value, ups })}
                    onInvalid={onInvalid}
                  />
                </div>
                <div className="popover-sub-row">
                  <span className="popover-sub-label">downs:</span>
                  <BaseIdentifierDropdown
                    options={options}
                    value={value.downs}
                    onChange={(downs) => onChange({ ...value, downs })}
                    onInvalid={onInvalid}
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
