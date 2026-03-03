import { useContext, useMemo } from "react";

import {
  type CalledIdentifier,
  CalledIdentifierSchema,
  resolveCalledIdentifier,
} from "../instructions/_base";
import { getDancerState } from "../worldState";
import { InlineDropdown } from "./InlineDropdown";
import { useInstructionEdit } from "./InstructionEditContext";
import { CalledIdentifierHighlightContext } from "./RelationshipHighlightContext";

export function CalledIdentifierDropdown({
  options,
  value,
  onChange,
}: {
  options: CalledIdentifier[];
  value: CalledIdentifier;
  onChange: (value: CalledIdentifier) => void;
}) {
  const highlightRelationship = useContext(CalledIdentifierHighlightContext);
  const { dancerStates } = useInstructionEdit();

  const sortedOptions = useMemo(() => {
    if (!dancerStates) return options;
    const larkState = dancerStates["up_lark_0"];
    return [...options].sort((a, b) => {
      const aId = resolveCalledIdentifier("up_lark_0", a, dancerStates);
      const bId = resolveCalledIdentifier("up_lark_0", b, dancerStates);
      if (!(aId && bId)) return 0;
      const targetA = getDancerState(aId, dancerStates);
      const targetB = getDancerState(bId, dancerStates);
      const distA = larkState.pos.subtract(targetA.pos).length();
      const distB = larkState.pos.subtract(targetB.pos).length();
      if (Math.abs(distA - distB) > 1e-6) return distA - distB;
      return a < b ? -1 : 1;
    });
  }, [options, dancerStates]);

  return (
    <InlineDropdown
      options={sortedOptions}
      value={value}
      onChange={(v) => onChange(CalledIdentifierSchema.parse(v))}
      onHighlight={highlightRelationship}
    />
  );
}
