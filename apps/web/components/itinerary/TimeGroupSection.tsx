'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Sunset, Moon, Sparkles, ChevronDown, Plus } from 'lucide-react';
import { TIME_OF_DAY_CONFIG, TIME_SECTION_COLORS } from '@travyl/shared';
import type { TimeGroup } from '@travyl/shared';
import type { CardStyle } from './ActivityCardRenderer';
import { ActivityCardRenderer } from './ActivityCardRenderer';

interface TimeGroupSectionProps {
  group: TimeGroup;
  onActivityClick?: (activityId: string) => void;
  onAddActivity?: (timeOfDay: string) => void;
  cardStyle?: CardStyle;
  collapsed?: boolean;
  onToggleCollapse?: (timeOfDay: string) => void;
}

const ICON_MAP = {
  sun: Sun,
  sunset: Sunset,
  moon: Moon,
  sparkles: Sparkles,
} as const;

export function TimeGroupSection({ group, onActivityClick, onAddActivity, cardStyle = 'legacy', collapsed, onToggleCollapse }: TimeGroupSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isControlled = collapsed !== undefined;
  const expanded = isControlled ? !collapsed : internalExpanded;
  const toggle = () => {
    if (isControlled && onToggleCollapse) {
      onToggleCollapse(group.timeOfDay);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setMeasuredHeight(contentRef.current.scrollHeight);
    }
  }, [group.activities.length, expanded]);

  const config = TIME_OF_DAY_CONFIG[group.timeOfDay as keyof typeof TIME_OF_DAY_CONFIG];
  const sectionColors = TIME_SECTION_COLORS[group.timeOfDay as keyof typeof TIME_SECTION_COLORS] ?? TIME_SECTION_COLORS.morning;
  const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP] ?? Sun;
  const count = group.activities.length;

  return (
    <section className="mb-3.5">
      <button
        onClick={toggle}
        className="w-full rounded-xl px-3.5 py-3 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
        style={{ background: sectionColors.gradient }}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={18} className="text-white" />
          <div className="text-left">
            <span className="block text-sm font-semibold text-white">{config.label}</span>
            <span className="block text-[11px] text-white/85">
              {count} {count === 1 ? 'activity' : 'activities'}
            </span>
          </div>
        </div>
        <ChevronDown
          size={16}
          className="text-white transition-transform duration-300"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: expanded ? `${measuredHeight + 40}px` : '0px',
          opacity: expanded ? 1 : 0,
          willChange: 'max-height, opacity',
        }}
      >
        <div className={`mt-2.5 ${cardStyle === 'pin' ? 'grid grid-cols-2 gap-2.5' : 'space-y-2.5'}`}>
          {group.activities.map((activity, i) => (
            <ActivityCardRenderer
              key={activity.id}
              activity={activity}
              cardStyle={cardStyle}
              index={i}
              onClick={() => onActivityClick?.(activity.id)}
            />
          ))}

          {/* Add Activity button */}
          <button
            onClick={() => onAddActivity?.(group.timeOfDay)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[#1e3a5f]/20 text-[#1e3a5f] hover:border-[#1e3a5f]/40 hover:bg-[#1e3a5f]/5 transition-colors"
          >
            <Plus size={14} />
            <span className="text-[12px] font-medium">Add {config.label} Activity</span>
          </button>
        </div>
      </div>
    </section>
  );
}
