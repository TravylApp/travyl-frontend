'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Users, Clock, LogIn, Sparkles, Building2, Plane, ImageIcon, Sun, Sunset, Moon, ChevronDown } from 'lucide-react';
import { useAuthStore, TIME_OF_DAY_CONFIG } from '@travyl/shared';
import type { PlanResponse, DiscoverItem, ItineraryDayViewModel, TimeGroup, ActivityViewModel } from '@travyl/shared';
import { savePlanToSupabase } from '@travyl/shared/src/services/api';
import { DaySelector } from '@/components/itinerary';
import { ItineraryPinCard } from '@/components/itinerary/ItineraryPinCard';
import { OceanWave, Footer } from '@/components/home';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'latenight';

function getTimeOfDay(time: string): TimeOfDay {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'latenight';
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const TOD_ICONS = { sun: Sun, sunset: Sunset, moon: Moon, sparkles: Moon } as const;

interface SlotWithImage {
  activity: ActivityViewModel;
  images: string[];
  rating: number;
  description: string;
  tags: string[];
  category: string;
  timeOfDay: TimeOfDay;
  bookedTime: string | null;
}

function planToData(plan: PlanResponse) {
  const days: ItineraryDayViewModel[] = [];
  const slotsByDay = new Map<number, SlotWithImage[]>();

  for (const day of plan.itinerary) {
    const slots: SlotWithImage[] = [];
    const groupMap = new Map<TimeOfDay, ActivityViewModel[]>();

    for (let i = 0; i < day.slots.length; i++) {
      const slot = day.slots[i];
      const tod = getTimeOfDay(slot.start_time);
      const start12 = formatTime12h(slot.start_time);
      const end12 = formatTime12h(slot.end_time);

      const activity: ActivityViewModel = {
        id: slot.poi.id || `slot-${day.day}-${i}`,
        name: slot.poi.name,
        category: slot.poi.category,
        locationName: slot.poi.name,
        startTime: start12,
        endTime: end12,
        timeDisplay: `${start12} – ${end12}`,
        costDisplay: null,
        bookingUrl: null,
        notes: slot.poi.description || null,
        source: 'ai' as any,
        timeOfDay: tod,
      };

      const list = groupMap.get(tod) ?? [];
      list.push(activity);
      groupMap.set(tod, list);

      slots.push({
        activity,
        images: slot.poi.photo_url ? [slot.poi.photo_url] : [],
        rating: slot.poi.rating || 4.5,
        description: slot.poi.description || '',
        tags: slot.poi.tags || [],
        category: slot.poi.category,
        timeOfDay: tod,
        bookedTime: start12,
      });
    }

    slotsByDay.set(day.day, slots);

    const order: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'latenight'];
    const timeGroups: TimeGroup[] = order
      .filter((tod) => groupMap.has(tod))
      .map((tod) => ({ timeOfDay: tod, activities: groupMap.get(tod)! }));

    days.push({
      id: `preview-day-${day.day}`,
      dayNumber: day.day,
      dayLabel: `Day ${day.day}`,
      dateLabel: formatDayDate(day.date),
      theme: null,
      notes: null,
      timeGroups,
      activityCount: day.slots.length,
    });
  }

  return { days, slotsByDay };
}

function slotToDiscoverItem(slot: SlotWithImage, dayNum: number): DiscoverItem {
  return {
    id: slot.activity.id,
    name: slot.activity.name,
    location: slot.activity.locationName || '',
    description: slot.description,
    images: slot.images,
    rating: slot.rating,
    tags: slot.tags.slice(0, 3),
    category: slot.category,
    isBooked: true,
    bookedDay: dayNum,
    bookedTime: slot.bookedTime || undefined,
  };
}

const THEME_BASE = '#1e3a5f';

export default function TripPreview() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pendingPlan');
      if (raw) setPlan(JSON.parse(raw));
      else router.replace('/');
    } catch {
      router.replace('/');
    }
  }, [router]);

  const { days, slotsByDay } = useMemo(() => (plan ? planToData(plan) : { days: [], slotsByDay: new Map() }), [plan]);
  const currentDay = days[selectedDay];
  const currentSlots = slotsByDay.get(currentDay?.dayNumber ?? 0) ?? [];

  const handleSave = async () => {
    if (!plan?.extracted || !user) return;
    setSaving(true);
    setSaveError(null);
    try {
      const tripId = await savePlanToSupabase(plan as any);
      sessionStorage.removeItem('pendingPlan');
      router.push(`/trip/${tripId}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  if (!plan?.extracted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-sm text-gray-400">Loading plan...</div>
      </div>
    );
  }

  const ext = plan.extracted;
  const dest = ext.destination;

  // Group current slots by time of day for rendering
  const slotsByTod = new Map<TimeOfDay, SlotWithImage[]>();
  for (const s of currentSlots) {
    const list = slotsByTod.get(s.timeOfDay) ?? [];
    list.push(s);
    slotsByTod.set(s.timeOfDay, list);
  }
  const todOrder: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'latenight'];

  return (
    <div
      className="-mt-16 pt-16"
      style={{
        ['--trip-base' as string]: THEME_BASE,
        ['--trip-base-light' as string]: '#2d5a8e',
        ['--trip-base-rgb' as string]: '30 58 95',
        ['--magazine-bg' as string]: '#f5f0eb',
        ['--magazine-heading' as string]: '#1a1a2e',
        ['--magazine-border' as string]: 'rgba(0,0,0,0.08)',
      }}
    >
      {/* Hero Banner — full width */}
      <div className="relative h-[200px] sm:h-[240px] overflow-hidden">
        {plan.destination_photo_url ? (
          <img src={plan.destination_photo_url} alt={dest.city} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e]">
            <ImageIcon size={32} className="text-white/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }} />
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MapPin size={14} className="text-white/60" />
            <span className="text-lg font-bold text-white">{dest.city}, {dest.country}</span>
          </div>
          <span className="text-xs text-white/80 flex items-center gap-4">
            {ext.dates.start && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {ext.dates.start}{ext.dates.end ? ` – ${ext.dates.end}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users size={12} />
              {ext.travelers.count} {ext.travelers.count === 1 ? 'traveler' : 'travelers'}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {ext.duration_days} days
            </span>
          </span>
        </div>
      </div>

      <div className="h-2" />

      {/* Main content card — matches trip layout */}
      <div className="relative z-10 rounded-2xl border border-gray-200/80 bg-white mx-2 sm:mx-4 max-w-7xl lg:mx-auto" style={{ boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        {/* Save CTA Banner */}
        <div className="rounded-t-2xl border-b border-gray-100 px-5 py-3.5 flex items-center justify-between gap-4 bg-gradient-to-r from-[#f0f9ff] to-white">
          {user ? (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-900">Save this trip to your account</p>
                <p className="text-xs text-gray-500">Edit, share, and access your full itinerary anytime.</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
              >
                <Sparkles size={14} />
                {saving ? 'Saving...' : 'Save to My Trips'}
              </button>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-900">Sign in to save this trip</p>
                <p className="text-xs text-gray-500">Create an account to save, edit, and share your itinerary.</p>
              </div>
              <a
                href="/auth/sign-in"
                className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#162d4a] transition-colors flex items-center gap-2 shrink-0"
              >
                <LogIn size={14} />
                Sign In
              </a>
            </>
          )}
        </div>
        {saveError && (
          <div className="mx-5 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
        )}

        {/* Itinerary Content */}
        <div className="px-5 pt-4 pb-5">
          {/* Day Selector */}
          {days.length > 0 && (
            <DaySelector days={days} selectedIndex={selectedDay} onSelect={setSelectedDay} />
          )}

          {/* Time groups with pin cards — matches real itinerary page */}
          {todOrder.filter(tod => slotsByTod.has(tod)).map((tod) => {
            const config = TIME_OF_DAY_CONFIG[tod as keyof typeof TIME_OF_DAY_CONFIG];
            const Icon = TOD_ICONS[config.icon as keyof typeof TOD_ICONS] ?? Sun;
            const slots = slotsByTod.get(tod)!;

            return (
              <section key={tod} className="mb-3.5">
                {/* Time-of-day header — same as TimeGroupSection */}
                <div
                  className="w-full rounded-xl px-3.5 py-3 flex items-center justify-between shadow-sm"
                  style={{ backgroundColor: THEME_BASE }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={18} className="text-white" />
                    <div className="text-left">
                      <span className="block text-sm font-semibold text-white">{config.label}</span>
                      <span className="block text-[11px] text-white/85">
                        {slots.length} {slots.length === 1 ? 'activity' : 'activities'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2-column grid of pin cards — same as cardStyle="pin" */}
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  {slots.map((slot, i) => (
                    <ItineraryPinCard
                      key={slot.activity.id}
                      item={slotToDiscoverItem(slot, currentDay?.dayNumber ?? 1)}
                      index={i}
                      accentColor={THEME_BASE}
                      isFavorited={false}
                      onFavorite={() => {}}
                      flat
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Hotels */}
        {plan.hotels.length > 0 && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-[#1e3a5f]" />
              <h3 className="text-sm font-bold text-gray-900">Recommended Hotels</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plan.hotels.map((hotel, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{hotel.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {'★'.repeat(hotel.stars)}{'☆'.repeat(Math.max(0, 5 - hotel.stars))} · ${hotel.price_per_night}/night
                      </p>
                    </div>
                    {hotel.rating && (
                      <span className="text-xs font-bold text-[#1e3a5f] bg-blue-50 px-2 py-0.5 rounded-lg">{hotel.rating.toFixed(1)}</span>
                    )}
                  </div>
                  {hotel.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {hotel.amenities.slice(0, 4).map((a) => (
                        <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flights */}
        {plan.flights.length > 0 && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Plane size={16} className="text-[#1e3a5f]" />
              <h3 className="text-sm font-bold text-gray-900">Flight Options</h3>
            </div>
            <div className="space-y-2">
              {plan.flights.map((flight, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{flight.airline}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {flight.departure_time} → {flight.arrival_time} · {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#1e3a5f]">${flight.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full mt-12">
        <OceanWave />
        <Footer />
      </div>
    </div>
  );
}
