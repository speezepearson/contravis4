import { useContext, useMemo } from "react";

import {
  ALL_BASE_CALLED_IDENTIFIERS,
  type BaseCalledIdentifier,
  baseCalledIdentifierFromKey,
  baseCalledIdentifierToKey,
  type CalledIdentifier,
} from "../instructions/_base";
import { try_ } from "../utils";
import { Dancer } from "../worldState";
import { calledIdentifierToText } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";
import { useInstructionEdit } from "./InstructionEditContext";
import { CalledIdentifierHighlightContext } from "./RelationshipHighlightContext";

type IdentifierMode = "plain" | "PerRole" | "PerProgDir";

const MODE_LABELS: Record<IdentifierMode, string> = {
  plain: "plain",
  PerRole: "by role",
  PerProgDir: "by dir",
};

const MODE_OPTIONS: IdentifierMode[] = ["plain", "PerRole", "PerProgDir"];

function getMode(cid: CalledIdentifier): IdentifierMode {
  switch (cid.type) {
    case "label":
    case "PersonInDirection":
      return "plain";
    case "PerRole":
      return "PerRole";
    case "PerProgDir":
      return "PerProgDir";
  }
}

function getBaseValue(cid: CalledIdentifier): BaseCalledIdentifier {
  switch (cid.type) {
    case "label":
    case "PersonInDirection":
      return cid;
    case "PerRole":
      return cid.larks;
    case "PerProgDir":
      return cid.ups;
  }
}

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
    <InlineDropdown
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
    />
  );
}

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
  const mode = getMode(value);

  function handleModeChange(newMode: IdentifierMode) {
    if (newMode === mode) return;
    const base = getBaseValue(value);
    switch (newMode) {
      case "plain":
        onChange(base);
        break;
      case "PerRole":
        onChange({ type: "PerRole", larks: base, robins: base });
        break;
      case "PerProgDir":
        onChange({ type: "PerProgDir", ups: base, downs: base });
        break;
    }
  }

  return (
    <>
      <InlineDropdown
        options={MODE_OPTIONS}
        value={mode}
        getLabel={(m) => MODE_LABELS[m]}
        onChange={handleModeChange}
      />{" "}
      {mode === "plain" && (
        <BaseIdentifierDropdown
          options={options}
          value={getBaseValue(value)}
          onChange={onChange}
          onInvalid={onInvalid}
        />
      )}
      {mode === "PerRole" && value.type === "PerRole" && (
        <>
          {"larks: "}
          <BaseIdentifierDropdown
            options={options}
            value={value.larks}
            onChange={(larks) => onChange({ ...value, larks })}
            onInvalid={onInvalid}
          />
          {" robins: "}
          <BaseIdentifierDropdown
            options={options}
            value={value.robins}
            onChange={(robins) => onChange({ ...value, robins })}
            onInvalid={onInvalid}
          />
        </>
      )}
      {mode === "PerProgDir" && value.type === "PerProgDir" && (
        <>
          {"ups: "}
          <BaseIdentifierDropdown
            options={options}
            value={value.ups}
            onChange={(ups) => onChange({ ...value, ups })}
            onInvalid={onInvalid}
          />
          {" downs: "}
          <BaseIdentifierDropdown
            options={options}
            value={value.downs}
            onChange={(downs) => onChange({ ...value, downs })}
            onInvalid={onInvalid}
          />
        </>
      )}
    </>
  );
}
