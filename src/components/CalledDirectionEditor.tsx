import { useMemo } from "react";

import {
  ALL_BASE_CALLED_DIRECTIONS,
  type BaseCalledDirection,
  baseCalledDirectionFromKey,
  baseCalledDirectionToKey,
  type CalledDirection,
} from "../instructions/_base";
import { try_ } from "../utils";
import { Dancer } from "../worldState";
import { calledDirectionToText } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";
import { useInstructionEdit } from "./InstructionEditContext";

type DirectionMode = "plain" | "PerRole" | "PerProgDir";

const MODE_LABELS: Record<DirectionMode, string> = {
  plain: "plain",
  PerRole: "by role",
  PerProgDir: "by dir",
};

const MODE_OPTIONS: DirectionMode[] = ["plain", "PerRole", "PerProgDir"];

function getMode(dir: CalledDirection): DirectionMode {
  switch (dir.type) {
    case "PureDirection":
    case "TowardsLabel":
    case "TowardsPerson":
      return "plain";
    case "PerRole":
      return "PerRole";
    case "PerProgDir":
      return "PerProgDir";
  }
}

function getBaseValue(dir: CalledDirection): BaseCalledDirection {
  switch (dir.type) {
    case "PureDirection":
    case "TowardsLabel":
    case "TowardsPerson":
      return dir;
    case "PerRole":
      return dir.larks;
    case "PerProgDir":
      return dir.ups;
  }
}

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
    <InlineDropdown
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
    />
  );
}

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
  const mode = getMode(value);

  function handleModeChange(newMode: DirectionMode) {
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
        <BaseDirectionDropdown
          options={options}
          value={getBaseValue(value)}
          onChange={onChange}
        />
      )}
      {mode === "PerRole" && value.type === "PerRole" && (
        <>
          {"larks: "}
          <BaseDirectionDropdown
            options={options}
            value={value.larks}
            onChange={(larks) => onChange({ ...value, larks })}
          />
          {" robins: "}
          <BaseDirectionDropdown
            options={options}
            value={value.robins}
            onChange={(robins) => onChange({ ...value, robins })}
          />
        </>
      )}
      {mode === "PerProgDir" && value.type === "PerProgDir" && (
        <>
          {"ups: "}
          <BaseDirectionDropdown
            options={options}
            value={value.ups}
            onChange={(ups) => onChange({ ...value, ups })}
          />
          {" downs: "}
          <BaseDirectionDropdown
            options={options}
            value={value.downs}
            onChange={(downs) => onChange({ ...value, downs })}
          />
        </>
      )}
    </>
  );
}
