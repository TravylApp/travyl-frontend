'use client';

import { motion } from 'motion/react';

interface CountdownBadgeProps {
  startDate: string;
  endDate: string;
  status: string;
  size?: 'small' | 'large';
}

export function CountdownBadge({ startDate, endDate, status, size = 'small' }: CountdownBadgeProps) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Determine what to show
  let text = '';
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-600';
  let shouldPulse = false;

  if (status === 'active') {
    // Trip is currently active
    if (daysUntilEnd > 0) {
      text = `${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'} left`;
      bgColor = 'bg-emerald-500';
      textColor = 'text-white';
      shouldPulse = daysUntilEnd <= 3;
    } else {
      text = 'Last day';
      bgColor = 'bg-amber-500';
      textColor = 'text-white';
      shouldPulse = true;
    }
  } else if (status === 'completed' || status === 'abandoned') {
    return null; // Don't show countdown for completed/cancelled trips
  } else {
    // Upcoming trip
    if (daysUntilStart > 0) {
      text = `${daysUntilStart} day${daysUntilStart === 1 ? '' : 's'} until trip`;
      if (daysUntilStart <= 3) {
        bgColor = 'bg-amber-500';
        textColor = 'text-white';
        shouldPulse = true;
      } else if (daysUntilStart <= 7) {
        bgColor = 'bg-amber-400';
        textColor = 'text-white';
      } else if (daysUntilStart <= 14) {
        bgColor = 'bg-white/90';
        textColor = 'text-amber-700';
      } else {
        bgColor = 'bg-white/80';
        textColor = 'text-gray-700';
      }
    } else if (daysUntilStart === 0) {
      text = 'Starts today!';
      bgColor = 'bg-emerald-500';
      textColor = 'text-white';
      shouldPulse = true;
    } else {
      // Trip should have started but not marked active
      text = 'In progress';
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-700';
    }
  }

  const sizeClasses = size === 'large'
    ? 'px-3 py-1.5 text-sm font-semibold'
    : 'px-2 py-0.5 text-[10px] font-medium';

  const content = (
    <>
      {shouldPulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
      )}
      <span>{text}</span>
    </>
  );

  const className = `inline-flex items-center gap-1.5 rounded-full ${bgColor} ${textColor} ${sizeClasses}`;

  if (shouldPulse) {
    return (
      <motion.div
        className={className}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}
