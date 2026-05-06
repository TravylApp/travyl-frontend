'use client';

import { useState, useRef, useEffect } from 'react';

export interface EditableCellProps {
  value: number;
  onCommit: (next: number) => void;
  format: (n: number) => string;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}

export function EditableCell({ value, onCommit, format, ariaLabel, className = '', disabled }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
    // We intentionally seed `draft` only when entering edit mode;
    // changes to `value` while editing are ignored so the user's
    // in-progress input isn't overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onCommit(parsed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
  };

  if (disabled) {
    return <span className={`tabular-nums text-right ${className}`}>{format(value)}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={ariaLabel}
        className={`tabular-nums text-right border border-transparent rounded px-1.5 py-0.5 hover:bg-white hover:border-gray-200 dark:hover:bg-white/[0.04] dark:hover:border-white/10 transition-colors ${className}`}
      >
        {format(value)}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      step="any"
      min="0"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      }}
      aria-label={ariaLabel}
      className={`tabular-nums text-right border border-[var(--trip-base)] rounded px-1.5 py-0.5 outline-none ring-2 ring-[var(--trip-base)]/15 bg-white dark:bg-white/[0.06] text-gray-900 dark:text-white w-full ${className}`}
    />
  );
}
