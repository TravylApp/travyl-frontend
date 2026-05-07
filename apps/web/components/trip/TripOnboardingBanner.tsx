'use client';

import { useState, useEffect } from 'react';
import { X, CalendarDays, MapPin, Plane, Wallet } from 'lucide-react';

const STORAGE_KEY = 'travyl-onboarding-dismissed';

export function TripOnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const tips = [
    { icon: CalendarDays, text: 'View your itinerary' },
    { icon: MapPin, text: 'Explore places' },
    { icon: Plane, text: 'Search flights & hotels' },
    { icon: Wallet, text: 'Track your budget' },
  ];

  return (
    <div className="mx-4 sm:mx-6 md:ml-20 md:mr-6 mt-4 mb-2 rounded-2xl border border-white/20 backdrop-blur-md px-5 py-4"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 100%)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-gray-800 mb-2">Welcome to your trip! Here&apos;s what you can do:</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {tips.map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-1.5 text-sm text-gray-600">
                <Icon size={14} className="text-gray-400 shrink-0" />
                {text}
              </span>
            ))}
          </div>
          <button onClick={dismiss}
            className="mt-3 px-4 py-1.5 text-[12px] font-semibold rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--trip-base, #3b82f6)' }}>
            Got it
          </button>
        </div>
        <button onClick={dismiss} className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
          <X size={14} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
