import { useContext, useMemo } from "react";

import {
  type CalledIdentifier,
  CalledIdentifierSchema,
  resolveCalledIdentifier,
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
  const { dancerStates } = useInstructionEdit();

  const sortedOptions = useMemo(() => {
    if (!dancerStates) return options;
    const larkState = dancerStates["up_lark_0"];
    return [...options].sort((a, b) => {
      const aId = try_(() =>
        resolveCalledIdentifier("up_lark_0", a, dancerStates),
      );
      if (aId instanceof Error || !aId) return 1;
      const bId = try_(() =>
        resolveCalledIdentifier("up_lark_0", b, dancerStates),
      );
      if (bId instanceof Error || !bId) return -1;
      const targetA = Dancer.get(aId, dancerStates);
      const targetB = Dancer.get(bId, dancerStates);
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
