'use client';
import React from 'react';
import { MoreHorizontal, Train } from 'lucide-react';
import type { TransitCardViewModel } from './types';
import { VEHICLE_ICONS, VEHICLE_COLORS } from './transitIcons';

interface TransitCardProps {
  booking: TransitCardViewModel;
  onEdit: () => void;
  onDelete: () => void;
}

export function TransitCard({ booking, onEdit, onDelete }: TransitCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const modeColor = VEHICLE_COLORS[booking.vehicleType] ?? '#6B7280';

  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${modeColor}18` }}
          >
            <span style={{ color: modeColor }}>{VEHICLE_ICONS[booking.vehicleType] ?? <Train size={16} />}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {booking.provider || 'Transit'}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded capitalize">
                {booking.vehicleType.replace('_', ' ')}
              </span>
            </div>
            {booking.routeName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                {booking.routeName}
              </p>
            )}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <MoreHorizontal size={16} className="text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
              <button
                onClick={() => { onEdit(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Edit
              </button>
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm">
        <div className="flex-1">
          <p className="text-gray-900 dark:text-white font-medium">{booking.origin}</p>
          <p className="text-gray-500 dark:text-gray-400">{booking.departureDisplay || '\u2014'}</p>
        </div>
        <div className="text-gray-300 dark:text-gray-600">{'\u2192'}</div>
        <div className="flex-1 text-right">
          <p className="text-gray-900 dark:text-white font-medium">{booking.destination}</p>
          <p className="text-gray-500 dark:text-gray-400">{booking.arrivalDisplay || '\u2014'}</p>
        </div>
      </div>

      {(booking.bookingRef || booking.price != null) && (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          {booking.bookingRef && <span>Ref: {booking.bookingRef}</span>}
          {booking.price != null && (
            <span className="ml-auto font-medium text-gray-700 dark:text-gray-300">
              {booking.currency}{booking.price}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
