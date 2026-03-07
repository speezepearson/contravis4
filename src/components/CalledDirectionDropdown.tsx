import { useMemo } from "react";

import {
  type CalledDirection,
  CalledDirectionSchema,
  PureDirectionSchema,
} from "../instructions/_base";
import { parses, try_ } from "../utils";
import { Dancer } from "../worldState";
import { calledDirectionToText } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";
import { useInstructionEdit } from "./InstructionEditContext";

export function CalledDirectionDropdown({
  options,
  value,
  onChange,
}: {
  options: CalledDirection[];
  value: CalledDirection;
  onChange: (value: CalledDirection) => void;
}) {
  const { dancerStates } = useInstructionEdit();

  const sortedOptions = useMemo(() => {
    if (!dancerStates) return options;
    const larkState = dancerStates["up_lark_0"];
    return [
      ...options.filter((o) => parses(PureDirectionSchema, o)),
      ...options
        .filter((o) => !parses(PureDirectionSchema, o))
        .sort((a, b) => {
          const targetA = try_(() =>
            Dancer.get("up_lark_0", dancerStates).resolveCalledDirectionTarget(
              a,
            ),
          );
          if (targetA instanceof Error || !targetA) return 1;
          const targetB = try_(() =>
            Dancer.get("up_lark_0", dancerStates).resolveCalledDirectionTarget(
              b,
            ),
          );
          if (targetB instanceof Error || !targetB) return -1;
          const distA = larkState.pos.subtract(targetA.pos).length();
          const distB = larkState.pos.subtract(targetB.pos).length();
          if (Math.abs(distA - distB) > 1e-6) return distA - distB;
          return a < b ? -1 : 1;
        }),
    ];
  }, [options, dancerStates]);

  return (
    <InlineDropdown
      options={sortedOptions}
      value={value}
      getLabel={(v) => calledDirectionToText(CalledDirectionSchema.parse(v))}
      onChange={(v) => onChange(CalledDirectionSchema.parse(v))}
    />
  );
}
