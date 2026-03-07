import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";

import {
  type CalledIdentifier,
  CalledIdentifierSchema,
} from "../instructions/_base";
import { indexOf } from "../utils";
import { useInstructionEdit } from "./InstructionEditContext";
import { SearchableDropdown } from "./SearchableDropdown";

interface Props<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  getLabel?: (value: T) => string;
  onInvalid?: () => void;
  onHighlight?: (cid: CalledIdentifier | null) => void;
  autoFocus?: boolean;
}

export function InlineDropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder,
  getLabel,
  onInvalid,
  onHighlight,
  autoFocus,
}: Props<T>) {
  const [open, setOpen] = useState(autoFocus ?? false);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const { onPopoverOpen } = useInstructionEdit();

  const canCycle = options.length <= 3;

  function cycle() {
    const idx = indexOf(options, value);
    onChange(options[idx === undefined ? 0 : (idx + 1) % options.length]);
  }

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => dropdownRef.current?.focus());
    }
  }, [open]);

  const displayText = value
    ? getLabel
      ? getLabel(value)
      : value
    : (placeholder ?? "...");

  if (canCycle) {
    return (
      <span
        className={`inline-value${!value ? " inline-value-placeholder" : ""}`}
        tabIndex={0}
        role="button"
        onClick={cycle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            cycle();
          }
        }}
      >
        {displayText}
      </span>
    );
  }

  function handleCommit() {
    setOpen(false);
    onHighlight?.(null);
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) onPopoverOpen?.();
    if (!v) onHighlight?.(null);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <span
          className={`inline-value${!value ? " inline-value-placeholder" : ""}`}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOpenChange(!open);
            }
          }}
        >
          {displayText}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="popover-content"
          sideOffset={4}
          align="start"
        >
          <SearchableDropdown
            options={options}
            value={value}
            onChange={(v) => {
              const opt = options.find((o) => o === v);
              if (opt) onChange(opt);
              else onInvalid?.();
            }}
            onCommit={handleCommit}
            placeholder={placeholder}
            selectOnly
            getLabel={getLabel}
            onHighlight={(v) => {
              const cid = CalledIdentifierSchema.safeParse(v);
              if (cid.success) onHighlight?.(cid.data);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
