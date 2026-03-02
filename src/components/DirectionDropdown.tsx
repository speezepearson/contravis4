import type { RelativeDirection } from "../instructions/index";
import { DIR_OPTIONS, directionToText, parseDirection } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";

export function DirectionDropdown({
  value,
  onChange,
  onInvalid,
  placeholder,
}: {
  value: RelativeDirection;
  onChange: (value: RelativeDirection) => void;
  onInvalid?: () => void;
  placeholder?: string;
}) {
  return (
    <InlineDropdown
      options={DIR_OPTIONS}
      value={directionToText(value)}
      onChange={(v) => {
        const dir = parseDirection(v);
        if (dir) onChange(dir);
        else onInvalid?.();
      }}
      placeholder={placeholder ?? "e.g. across"}
    />
  );
}
