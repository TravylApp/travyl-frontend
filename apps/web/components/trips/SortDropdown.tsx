'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type SortOption = 'date_asc' | 'date_desc' | 'budget' | 'updated' | 'name';

interface SortConfig {
  value: SortOption;
  label: string;
}

const SORT_OPTIONS: SortConfig[] = [
  { value: 'date_asc', label: 'Nearest date first' },
  { value: 'date_desc', label: 'Furthest date first' },
  { value: 'budget', label: 'Budget (high to low)' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'name', label: 'Name (A-Z)' },
];

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: SortOption) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm hover:bg-white hover:shadow-md transition-all text-sm"
      >
        <span className="text-gray-500">Sort:</span>
        <span className="font-medium text-gray-700">{selectedOption.label}</span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 rounded-xl bg-white/95 backdrop-blur-md border border-gray-100 shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                value === option.value ? 'text-primary-dark font-medium bg-amber-50' : 'text-gray-600'
              }`}
            >
              <span>{option.label}</span>
              {value === option.value && (
                <Check size={14} className="text-accent-amber" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
