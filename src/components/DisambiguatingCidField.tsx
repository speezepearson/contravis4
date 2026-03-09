import {
  type CalledIdentifier,
  CalledIdentifierSchema,
} from "../instructions/_base";
import { calledIdentifierToText } from "./fieldUtils";
import { InlineDropdown } from "./InlineDropdown";

const NONE = "" as const;
type OptionValue = typeof NONE | CalledIdentifier;

const options: readonly OptionValue[] = [
  NONE,
  ...CalledIdentifierSchema.options,
];

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
    />
  );
}
