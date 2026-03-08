'use client';

import { Flag } from 'lucide-react';
import type { ItineraryDayViewModel } from '@travyl/shared';
import { TimeGroupSection } from './TimeGroupSection';

interface DayViewProps {
  day: ItineraryDayViewModel;
  onActivityClick?: (activityId: string) => void;
}

export function DayView({ day, onActivityClick }: DayViewProps) {
  return (
    <div>
      {day.theme && (
        <div className="flex items-center gap-2 mb-3.5 px-1">
          <Flag size={13} className="text-gray-500" />
          <h2 className="text-[15px] font-semibold text-gray-800">{day.theme}</h2>
        </div>
      )}
      {day.timeGroups.map((group) => (
        <TimeGroupSection key={group.timeOfDay} group={group} onActivityClick={onActivityClick} />
      ))}
      {day.notes && (
        <div className="bg-gray-50 rounded-[10px] p-3 mt-1 mb-3 border border-gray-100">
          <p className="text-xs text-gray-500 italic leading-[18px]">{day.notes}</p>
        </div>
      )}
    </div>
  );
}
