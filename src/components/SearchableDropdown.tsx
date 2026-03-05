import "./SearchableDropdown.css";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface SearchableDropdownHandle {
  focus: () => void;
}

interface Props {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  onCommit?: () => void;
  selectOnly?: boolean;
  placeholder?: string;
  getLabel?: (value: string) => string;
  onHighlight?: (value: string | null) => void;
}

const SearchableDropdown = forwardRef<SearchableDropdownHandle, Props>(
  function SearchableDropdown(
    {
      options,
      value,
      onChange,
      onCommit,
      selectOnly: selectOnlyProp,
      placeholder,
      getLabel,
      onHighlight,
    },
    ref,
  ) {
    const selectOnly = selectOnlyProp ?? !!getLabel;
    const [open, setOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const [searchText, setSearchText] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const labelOf = (opt: string) => (getLabel ? getLabel(opt) : opt);

    const query = (selectOnly ? searchText : value).toLowerCase();
    const filtered = query
      ? options.filter((opt) =>
          new RegExp("\\b" + query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(
            labelOf(opt).toLowerCase(),
          ),
        )
      : options;

    const inputValue = selectOnly
      ? open
        ? searchText
        : value
          ? labelOf(value)
          : ""
      : value;

    const filteredKey = filtered.join("\0");
    const [prevFilteredKey, setPrevFilteredKey] = useState(filteredKey);
    if (filteredKey !== prevFilteredKey) {
      setPrevFilteredKey(filteredKey);
      setHighlightIndex(filtered.length > 0 ? 0 : -1);
    }

    useEffect(() => {
      if (highlightIndex >= 0 && listRef.current) {
        const child = listRef.current.children[highlightIndex];
        const item = child instanceof HTMLElement ? child : undefined;
        if (item?.scrollIntoView) item.scrollIntoView({ block: "nearest" });
      }
    }, [highlightIndex]);

    function handleFocus() {
      setOpen(true);
      if (selectOnly) setSearchText("");
      setHighlightIndex(filtered.length > 0 ? 0 : -1);
    }

    function handleClick() {
      if (!open) {
        setOpen(true);
        if (selectOnly) setSearchText("");
        setHighlightIndex(options.length > 0 ? 0 : -1);
      }
    }

    function handleBlur(e: React.FocusEvent) {
      if (
        e.relatedTarget instanceof Node &&
        containerRef.current?.contains(e.relatedTarget)
      )
        return;
      setOpen(false);
      setHighlightIndex(-1);
      onHighlight?.(null);
      if (selectOnly) {
        setSearchText("");
      } else {
        if (!options.includes(value)) {
          onChange("");
        }
      }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filtered.length === 0) return;
        const newIdx = (highlightIndex + 1) % filtered.length;
        setHighlightIndex(newIdx);
        onHighlight?.(filtered[newIdx]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filtered.length === 0) return;
        const newIdx = (highlightIndex - 1 + filtered.length) % filtered.length;
        setHighlightIndex(newIdx);
        onHighlight?.(filtered[newIdx]);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          e.preventDefault();
          selectOption(filtered[highlightIndex]);
        }
        setOpen(false);
        setHighlightIndex(-1);
        onHighlight?.(null);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setHighlightIndex(-1);
        onHighlight?.(null);
        if (selectOnly) setSearchText("");
      }
    }

    function selectOption(opt: string) {
      onChange(opt);
      onCommit?.();
      setOpen(false);
      setHighlightIndex(-1);
      onHighlight?.(null);
      if (selectOnly) setSearchText("");
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      if (selectOnly) {
        setSearchText(e.target.value);
        setOpen(true);
      } else {
        onChange(e.target.value);
        setOpen(true);
      }
    }

    return (
      <div
        className="searchable-dropdown"
        ref={containerRef}
        onBlur={handleBlur}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          size={Math.max(
            (inputValue?.length || placeholder?.length || 0) + 2,
            4,
          )}
          onChange={handleChange}
          onFocus={handleFocus}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {open && (
          <ul
            className="searchable-dropdown-popover"
            role="listbox"
            ref={listRef}
          >
            {filtered.map((opt, i) => (
              <li
                key={opt}
                role="option"
                aria-selected={i === highlightIndex}
                className={i === highlightIndex ? "highlighted" : ""}
                onMouseEnter={() => onHighlight?.(opt)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(opt);
                }}
              >
                {labelOf(opt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);

export default SearchableDropdown;
