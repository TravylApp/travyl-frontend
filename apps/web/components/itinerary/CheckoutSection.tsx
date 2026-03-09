'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Clock, MapPin, Key, AlertCircle, Car } from 'lucide-react';

interface CheckoutSectionProps {
  hotelName: string;
  hotelAddress: string;
  checkOutTime: string;
  collapsed?: boolean;
}

export function CheckoutSection({ hotelName, hotelAddress, checkOutTime, collapsed }: CheckoutSectionProps) {
  const [expanded, setExpanded] = useState(false);

  // Sync with parent collapse-all
  useEffect(() => {
    if (collapsed !== undefined) {
      setExpanded(!collapsed);
    }
  }, [collapsed]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setMeasuredHeight(contentRef.current.scrollHeight);
    }
  }, [expanded]);

  return (
    <section className="mb-3.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full rounded-xl px-3.5 py-3 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
        style={{ background: 'linear-gradient(135deg, #2d4a6f, #3a6b9f)' }}
      >
        <div className="flex items-center gap-2.5">
          <Building2 size={18} className="text-white" />
          <div className="text-left">
            <span className="block text-sm font-semibold text-white">Check-out</span>
            <span className="block text-[11px] text-white/85">{checkOutTime} · {hotelName}</span>
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
          maxHeight: expanded ? `${measuredHeight + 20}px` : '0px',
          opacity: expanded ? 1 : 0,
          willChange: 'max-height, opacity',
        }}
      >
        <div className="mt-2 bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
              <Clock size={16} className="text-orange-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Check-out by {checkOutTime}</p>
                <p className="text-xs text-gray-500">Late checkout may incur additional charges</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Building2 size={16} className="text-gray-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">{hotelName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-gray-400" />
                  <span className="text-xs text-gray-500">{hotelAddress}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Reminders</h4>
            <div className="space-y-2">
              <Reminder icon={<Key size={13} />} text="Return room keys to front desk" />
              <Reminder icon={<AlertCircle size={13} />} text="Check minibar charges before leaving" />
              <Reminder icon={<Car size={13} />} text="Arrange transportation to next destination" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Reminder({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
      <span className="text-amber-600 shrink-0">{icon}</span>
      <span className="text-xs text-gray-700">{text}</span>
    </div>
  );
}
