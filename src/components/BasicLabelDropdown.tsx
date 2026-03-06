import type { CalledLabel } from "../instructions/_base";
import { InlineDropdown } from "./InlineDropdown";

export function BasicLabelDropdown<T extends CalledLabel>({
  options,
  value,
  onChange,
  onInvalid,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  onInvalid?: () => void;
}) {
  return (
    <InlineDropdown
      options={options}
      value={value}
      onChange={(v) => {
        const opt = options.find((o) => o === v);
        if (opt) onChange(opt);
        else onInvalid?.();
      }}
    />
  );
}
