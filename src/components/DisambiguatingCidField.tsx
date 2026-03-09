import { useContext, useMemo } from "react";

import {
  type CalledIdentifier,
  CalledIdentifierSchema,
} from "../instructions/_base";
import { try_ } from "../utils";
import { Dancer } from "../worldState";
import { calledIdentifierToText } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";
import { useInstructionEdit } from "./InstructionEditContext";
import { CalledIdentifierHighlightContext } from "./RelationshipHighlightContext";

const NONE = "" as const;
type OptionValue = typeof NONE | CalledIdentifier;

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

  const sortedOptions = useMemo(() => {
    const cidOptions = [...CalledIdentifierSchema.options];
    if (!dancerStates) return cidOptions;
    const larkState = dancerStates["up_lark_0"];
    cidOptions.sort((a, b) => {
      const targetA = try_(() =>
        Dancer.get("up_lark_0", dancerStates).resolveCalledIdentifier(a),
      );
      if (targetA instanceof Error || !targetA) return 1;
      const targetB = try_(() =>
        Dancer.get("up_lark_0", dancerStates).resolveCalledIdentifier(b),
      );
      if (targetB instanceof Error || !targetB) return -1;
      const distA = larkState.pos.subtract(targetA.pos).length();
      const distB = larkState.pos.subtract(targetB.pos).length();
      if (Math.abs(distA - distB) > 1e-6) return distA - distB;
      return a < b ? -1 : 1;
    });
    return cidOptions;
  }, [dancerStates]);

  const options: readonly OptionValue[] = useMemo(
    () => [NONE, ...sortedOptions],
    [sortedOptions],
  );

  return (
    <InlineDropdown
      options={options}
      value={value ?? NONE}
      onChange={(v) => {
        if (v === NONE) {
          onChange(undefined);
          return;
        }
        const cid = CalledIdentifierSchema.safeParse(v);
        if (cid.success) onChange(cid.data);
        else onInvalid?.();
      }}
      getLabel={(v) =>
        v === NONE
          ? "(give hint)"
          : calledIdentifierToText(CalledIdentifierSchema.parse(v))
      }
      onHighlight={highlightRelationship}
    />
  );
}
