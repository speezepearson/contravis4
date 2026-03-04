import * as Popover from "@radix-ui/react-popover";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  type CalledIdentifier,
  CalledIdentifierSchema,
} from "../instructions/_base";
import { useInstructionEdit } from "./InstructionEditContext";
import type { SearchableDropdownHandle } from "./SearchableDropdown";
import SearchableDropdown from "./SearchableDropdown";

export interface InlineDropdownHandle {
  focus: () => void;
}

interface Props {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  getLabel?: (value: string) => string;
  onHighlight?: (cid: CalledIdentifier | null) => void;
}

export const InlineDropdown = forwardRef<InlineDropdownHandle, Props>(
  function InlineDropdown(
    { options, value, onChange, placeholder, getLabel, onHighlight },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<SearchableDropdownHandle>(null);
    const { onPopoverOpen } = useInstructionEdit();

    const canCycle = options.length <= 3;

    function cycle() {
      const idx = options.indexOf(value);
      onChange(options[(idx + 1) % options.length]);
    }

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (canCycle) cycle();
        else setOpen(true);
      },
    }));

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
        >
          {displayText}
        </span>
      );
    }

    function handleChange(v: string) {
      onChange(v);
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
              ref={dropdownRef}
              options={options}
              value={value}
              onChange={handleChange}
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
  },
);
