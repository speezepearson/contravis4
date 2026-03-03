import { type BasicLabel, BasicLabelSchema } from "../worldState";
import { InlineDropdown } from "./InlineDropdown";

export function BasicLabelDropdown({
  value,
  onChange,
}: {
  value: BasicLabel;
  onChange: (value: BasicLabel) => void;
}) {
  return (
    <InlineDropdown
      options={BasicLabelSchema.options}
      value={value}
      onChange={(v) => onChange(BasicLabelSchema.parse(v))}
    />
  );
}
