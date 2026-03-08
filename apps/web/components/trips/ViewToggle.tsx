'use client';

import { LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  view: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 rounded-full p-0.5">
      <button
        onClick={() => onChange('grid')}
        className={`flex items-center justify-center w-8 h-7 rounded-full transition-all ${
          view === 'grid'
            ? 'bg-[#1e3a5f] text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Grid view"
      >
        <LayoutGrid size={15} />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`flex items-center justify-center w-8 h-7 rounded-full transition-all ${
          view === 'list'
            ? 'bg-[#1e3a5f] text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="List view"
      >
        <List size={15} />
      </button>
    </div>
  );
}
