import {
  type CardinalDirection,
  CardinalDirectionSchema,
} from "../instructions/_base";
import { cardinalDirectionToText, DIR_OPTIONS } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";

export function CardinalDirectionDropdown({
  value,
  onChange,
  onInvalid,
  placeholder,
}: {
  value: CardinalDirection;
  onChange: (value: CardinalDirection) => void;
  onInvalid?: () => void;
  placeholder?: string;
}) {
  return (
    <InlineDropdown
      options={DIR_OPTIONS}
      value={cardinalDirectionToText(value)}
      onChange={(v) => {
        const dir = CardinalDirectionSchema.safeParse(v);
        if (dir.success) onChange(dir.data);
        else onInvalid?.();
      }}
      placeholder={placeholder ?? "e.g. across"}
    />
  );
}
