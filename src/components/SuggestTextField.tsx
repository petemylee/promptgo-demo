'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type SuggestItem = { value: string; count: number };

type Props = {
  id?: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  suggestions: SuggestItem[];
  required?: boolean;
  /** class ของ wrapper ด้านนอก (ค่าเริ่มต้น mb-4 สำหรับฟอร์มรถ) */
  rootClassName?: string;
  /** class ของ input */
  inputClassName?: string;
  maxVisibleWhenEmpty?: number;
  maxVisibleFiltered?: number;
};

const defaultInputClass =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-[#0076c3]/60';

function normalizeForMatch(s: string) {
  return s.trim().toLowerCase();
}

export default function SuggestTextField({
  id,
  label,
  value,
  onChange,
  suggestions,
  required,
  rootClassName = 'mb-4',
  inputClassName = defaultInputClass,
  maxVisibleWhenEmpty = 18,
  maxVisibleFiltered = 24,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = normalizeForMatch(value);

  const visible = useMemo(() => {
    if (!q) {
      return suggestions.slice(0, maxVisibleWhenEmpty);
    }
    const filtered = suggestions
      .filter((s) => normalizeForMatch(s.value).includes(q))
      .slice(0, maxVisibleFiltered);
    if (filtered.length > 0) {
      return filtered;
    }
    // ไม่มีรายการที่ข้อความปัจจุบันเป็นส่วนหนึ่งของค่าแนะนำ (เช่น ค่าเริ่มต้นในช่องที่ยังไม่มีในฐานข้อมูล)
    // ยังแสดงรายการยอดนิยมให้เลือกได้ มิฉะนั้น dropdown จะไม่ขึ้นเลย
    return suggestions.slice(0, maxVisibleWhenEmpty);
  }, [suggestions, q, maxVisibleWhenEmpty, maxVisibleFiltered]);

  const close = useCallback(() => {
    setOpen(false);
    setHighlight(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, close]);

  const pick = (v: string) => {
    onChange(v);
    close();
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || visible.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setOpen(true);
        setHighlight(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Escape') {
      close();
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1 >= visible.length ? 0 : h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? visible.length - 1 : h - 1));
    } else if (e.key === 'Enter' && highlight >= 0 && highlight < visible.length) {
      e.preventDefault();
      pick(visible[highlight].value);
    }
  };

  return (
    <div className={rootClassName} ref={containerRef}>
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          required={required}
          className={inputClassName}
        />
        {open && visible.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-[100] mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
          >
            {visible.map((s, i) => (
              <li key={`${s.value}-${i}`} role="option" aria-selected={highlight === i}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    highlight === i ? 'bg-[#0076c3]/10' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s.value);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <span className="min-w-0 truncate">{s.value}</span>
                  <span className="flex-shrink-0 text-xs tabular-nums text-gray-400">{s.count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
