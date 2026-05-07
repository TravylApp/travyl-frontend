'use client';
import React from 'react';

interface TransitBetweenDaysSectionProps {
  children: React.ReactNode;
}

export function TransitBetweenDaysSection({ children }: TransitBetweenDaysSectionProps) {
  const count = React.Children.count(children);
  if (count === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 py-2">
        <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Between Days
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-2 pl-6">{children}</div>
    </div>
  );
}
