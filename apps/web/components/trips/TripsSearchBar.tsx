'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface TripsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TripsSearchBar({
  value,
  onChange,
  placeholder = 'Search trips by name or destination...'
}: TripsSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className="relative w-full max-w-md">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center px-4 py-3">
        <Search size={18} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 px-3"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} className="text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}
