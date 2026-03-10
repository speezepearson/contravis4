import { useContext, useMemo } from "react";

import {
  type CalledIdentifier,
  calledIdentifierFromKey,
  calledIdentifierToKey,
} from "../instructions/_base";
import { try_ } from "../utils";
import { Dancer } from "../worldState";
import { calledIdentifierToText } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";
import { useInstructionEdit } from "./InstructionEditContext";
import { CalledIdentifierHighlightContext } from "./RelationshipHighlightContext";

export function CalledIdentifierDropdown<CId extends CalledIdentifier>({
  options,
  value,
  onChange,
  onInvalid,
}: {
  options: readonly CId[];
  value: CId;
  onChange: (value: CId) => void;
  onInvalid?: () => void;
}) {
  const highlightRelationship = useContext(CalledIdentifierHighlightContext);
  const { worldState: dancerStates } = useInstructionEdit();

  // Build a map from string key to the original CId object
  const keyMap = useMemo(() => {
    const map = new Map<string, CId>();
    for (const opt of options) {
      map.set(calledIdentifierToKey(opt), opt);
    }
    return map;
  }, [options]);

  const sortedKeys = useMemo(() => {
    const keys = options.map(calledIdentifierToKey);
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
      value={calledIdentifierToKey(value)}
      getLabel={(k) => {
        const cid = keyMap.get(k);
        return cid ? calledIdentifierToText(cid) : k;
      }}
      onChange={(k) => {
        const opt = keyMap.get(k);
        if (opt) onChange(opt);
        else {
          try {
            const parsed = calledIdentifierFromKey(k);
            const match = options.find(
              (o) => calledIdentifierToKey(o) === calledIdentifierToKey(parsed),
            );
            if (match) onChange(match);
            else onInvalid?.();
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
