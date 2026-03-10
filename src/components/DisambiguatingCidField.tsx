import { useContext, useMemo } from "react";

import {
  ALL_CALLED_IDENTIFIERS,
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

const NONE = "" as const;
type OptionValue = typeof NONE | string;

/** Inline field for an optional disambiguatingCid. Displays "(give hint)" when
 *  unset; clicking opens the CalledIdentifier options. Selecting the first
 *  option clears the value back to undefined. */
export function DisambiguatingCidField({
  value,
  onChange,
  onInvalid,
}: {
  value: CalledIdentifier | undefined;
  onChange: (value: CalledIdentifier | undefined) => void;
  onInvalid?: () => void;
}) {
  const highlightRelationship = useContext(CalledIdentifierHighlightContext);
  const { worldState: dancerStates } = useInstructionEdit();

  // Build key map for all CalledIdentifier values
  const keyMap = useMemo(() => {
    const map = new Map<string, CalledIdentifier>();
    for (const cid of ALL_CALLED_IDENTIFIERS) {
      map.set(calledIdentifierToKey(cid), cid);
    }
    return map;
  }, []);

  const sortedKeys = useMemo(() => {
    const cidKeys = ALL_CALLED_IDENTIFIERS.map(calledIdentifierToKey);
    if (!dancerStates) return cidKeys;
    const larkState = dancerStates["up_lark_0"];
    cidKeys.sort((a, b) => {
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
    return cidKeys;
  }, [dancerStates, keyMap]);

  const options: readonly OptionValue[] = useMemo(
    () => [NONE, ...sortedKeys],
    [sortedKeys],
  );

  return (
    <InlineDropdown
      options={options}
      value={value ? calledIdentifierToKey(value) : NONE}
      onChange={(v) => {
        if (v === NONE) {
          onChange(undefined);
          return;
        }
        const cid = keyMap.get(v);
        if (cid) onChange(cid);
        else {
          try {
            onChange(calledIdentifierFromKey(v));
          } catch {
            onInvalid?.();
          }
        }
      }}
      getLabel={(v) =>
        v === NONE
          ? "(give hint)"
          : calledIdentifierToText(keyMap.get(v) ?? calledIdentifierFromKey(v))
      }
      onHighlight={(v) => {
        if (!v) {
          highlightRelationship(null);
          return;
        }
        const cid = keyMap.get(v);
        if (cid) highlightRelationship(cid);
      }}
    />
  );
}
