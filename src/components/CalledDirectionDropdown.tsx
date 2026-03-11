import { useMemo } from "react";

import {
  type CalledDirection,
  calledDirectionFromKey,
  calledDirectionToKey,
} from "../instructions/_base";
import { try_ } from "../utils";
import { Dancer } from "../worldState";
import { calledDirectionToText } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";
import { useInstructionEdit } from "./InstructionEditContext";

export function CalledDirectionDropdown({
  options,
  value,
  onChange,
}: {
  options: readonly CalledDirection[];
  value: CalledDirection;
  onChange: (value: CalledDirection) => void;
}) {
  const { worldState: dancerStates } = useInstructionEdit();

  // Build a map from string key to the original CalledDirection object
  const keyMap = useMemo(() => {
    const map = new Map<string, CalledDirection>();
    for (const opt of options) {
      map.set(calledDirectionToKey(opt), opt);
    }
    return map;
  }, [options]);

  const sortedKeys = useMemo(() => {
    const pureKeys: string[] = [];
    const otherKeys: string[] = [];
    for (const opt of options) {
      const key = calledDirectionToKey(opt);
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
      value={calledDirectionToKey(value)}
      getLabel={(k) => {
        const dir = keyMap.get(k);
        return dir ? calledDirectionToText(dir) : k;
      }}
      onChange={(k) => {
        const opt = keyMap.get(k);
        if (opt) onChange(opt);
        else {
          try {
            onChange(calledDirectionFromKey(k));
          } catch {
            // ignore invalid keys
          }
        }
      }}
    />
  );
}
