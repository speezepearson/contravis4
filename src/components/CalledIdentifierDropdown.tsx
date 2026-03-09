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

export function CalledIdentifierDropdown<CId extends CalledIdentifier>({
  options,
  value,
  onChange,
  onInvalid,
}: {
  options: CId[];
  value: CId;
  onChange: (value: CId) => void;
  onInvalid?: () => void;
}) {
  const highlightRelationship = useContext(CalledIdentifierHighlightContext);
  const { worldState: dancerStates } = useInstructionEdit();

  const sortedOptions = useMemo(() => {
    if (!dancerStates) return options;
    const larkState = dancerStates["up_lark_0"];
    return [...options].sort((a, b) => {
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
  }, [options, dancerStates]);

  return (
    <InlineDropdown
      options={sortedOptions}
      value={value}
      getLabel={(v) => calledIdentifierToText(CalledIdentifierSchema.parse(v))} // TODO: make InlineDropdown generic so v isn't typed as string here
      onChange={(v) => {
        const opt = options.find((o) => o === v);
        if (opt) onChange(opt);
        else onInvalid?.();
      }}
      onHighlight={highlightRelationship}
    />
  );
}
