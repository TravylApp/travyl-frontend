'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { CalendarActivity } from '@travyl/shared';
import type { ItineraryDayViewModel, ActivityViewModel, TimeGroup } from '@travyl/shared';
import { useItineraryScreen } from '@travyl/shared';
import type { MapLocation } from '@/components/leaflet-map';

type BaseDayData = { id: string; dayNumber: number; dayLabel: string; dateLabel: string; theme?: string; notes?: string };

// ─── Conversion: CalendarActivity[] → ItineraryDayViewModel[] ─────

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'latenight';

function getTimeOfDay(startHour: number): TimeOfDay {
  if (startHour < 12) return 'morning';
  if (startHour < 17) return 'afternoon';
  if (startHour < 21) return 'evening';
  return 'latenight';
}

function calendarActivityToViewModel(a: CalendarActivity): ActivityViewModel {
  return {
    id: a.id,
    name: a.title,
    category: a.type,
    locationName: a.location ?? null,
    startTime: a.startTime ?? null,
    endTime: a.endTime ?? null,
    timeDisplay: a.startTime && a.endTime ? `${a.startTime} – ${a.endTime}` : a.startTime ?? null,
    costDisplay: a.price ?? null,
    bookingUrl: null,
    notes: null,
    source: 'user',
    timeOfDay: getTimeOfDay(a.startHour),
  };
}

function calendarActivitiesToDayViewModels(
  activities: CalendarActivity[],
  baseDays: BaseDayData[],
): ItineraryDayViewModel[] {
  // Group on-calendar, non-child activities by day
  const onCalendar = activities.filter((a) => a.onCalendar && !a.parentId);
  const childMap = new Map<string, CalendarActivity[]>();
  activities.filter((a) => a.onCalendar && a.parentId).forEach((a) => {
    const list = childMap.get(a.parentId!) ?? [];
    list.push(a);
    childMap.set(a.parentId!, list);
  });

  return baseDays.map((baseDay, idx) => {
    const dayActivities = onCalendar.filter((a) => a.day === idx);
    // Flatten: for parent blocks, include children as separate activities
    const allVMs: ActivityViewModel[] = [];
    for (const a of dayActivities) {
      allVMs.push(calendarActivityToViewModel(a));
      const children = childMap.get(a.id);
      if (children) {
        for (const child of children.sort((x, y) => x.startHour - y.startHour)) {
          allVMs.push(calendarActivityToViewModel(child));
        }
      }
    }

    // Group by time of day
    const order: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'latenight'];
    const groupMap = new Map<TimeOfDay, ActivityViewModel[]>();
    for (const vm of allVMs) {
      const list = groupMap.get(vm.timeOfDay) ?? [];
      list.push(vm);
      groupMap.set(vm.timeOfDay, list);
    }
    const timeGroups: TimeGroup[] = order
      .filter((tod) => groupMap.has(tod))
      .map((tod) => ({ timeOfDay: tod, activities: groupMap.get(tod)! }));

    return {
      id: baseDay.id,
      dayNumber: baseDay.dayNumber,
      dayLabel: baseDay.dayLabel,
      dateLabel: baseDay.dateLabel,
      theme: baseDay.theme ?? null,
      notes: baseDay.notes ?? null,
      timeGroups,
      activityCount: allVMs.length,
    };
  });
}

// ─── Context ─────────────────────────────────────────────────────

interface ItineraryContextValue {
  activities: CalendarActivity[];
  setActivities: React.Dispatch<React.SetStateAction<CalendarActivity[]>>;
  days: ItineraryDayViewModel[];
  addActivity: (activity: CalendarActivity) => void;
  removeActivity: (id: string) => void;
  updateActivity: (id: string, updates: Partial<CalendarActivity>) => void;
  moveActivityBefore: (dragId: string, targetId: string) => void;
  // Map control — any page can push markers and request map open/close
  mapMarkers: MapLocation[];
  setMapMarkers: React.Dispatch<React.SetStateAction<MapLocation[]>>;
  selectedMarkerId: string | undefined;
  setSelectedMarkerId: React.Dispatch<React.SetStateAction<string | undefined>>;
  requestMapOpen: boolean;
  setRequestMapOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Collapse state — persists across tab switches
  collapsedSections: Record<string, boolean>;
  setCollapsedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  allCollapsedOverride: boolean | null;
  setAllCollapsedOverride: React.Dispatch<React.SetStateAction<boolean | null>>;
  selectedDayIndex: number;
  setSelectedDayIndex: React.Dispatch<React.SetStateAction<number>>;
}

const ItineraryContext = createContext<ItineraryContextValue | null>(null);

// Generate itinerary from trip_context explore_items
function generateFromTripContext(
  trip: { travelers?: number; start_date?: string; trip_context?: { explore_items?: { id: string; title: string; description: string; category: string; image?: string }[] } } | null,
  durationDays: number,
): { days: BaseDayData[]; activities: CalendarActivity[] } {
  if (!trip?.trip_context?.explore_items?.length) return { days: [], activities: [] };

  const items = trip.trip_context.explore_items;
  const startDate = trip.start_date ? new Date(trip.start_date + 'T00:00:00') : new Date();

  const days: BaseDayData[] = [];
  const activities: CalendarActivity[] = [];

  const themes = ['Explore & Discover', 'Culture & History', 'Food & Relaxation', 'Adventure', 'Local Life'];

  for (let d = 0; d < durationDays; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    days.push({
      id: `day-${d}`,
      dayNumber: d + 1,
      dayLabel: `Day ${d + 1}`,
      dateLabel: dateStr,
      theme: themes[d % themes.length],
    });

    // Distribute items across days: ~3 per day across morning/afternoon/evening
    const dayItems = items.filter((_, i) => i % durationDays === d);
    const timeSlots = [
      { hour: 9, tod: 'morning', label: '9:00 AM', end: '10:30 AM' },
      { hour: 12, tod: 'afternoon', label: '12:00 PM', end: '1:30 PM' },
      { hour: 15, tod: 'afternoon', label: '3:00 PM', end: '4:30 PM' },
      { hour: 19, tod: 'evening', label: '7:00 PM', end: '8:30 PM' },
    ];

    dayItems.forEach((item, slotIdx) => {
      const slot = timeSlots[slotIdx % timeSlots.length];
      activities.push({
        id: `cal-${d}-${slotIdx}-${item.id}`,
        title: item.title,
        type: item.category?.toLowerCase() ?? 'sightseeing',
        day: d,
        startHour: slot.hour,
        duration: 1.5,
        startTime: slot.label,
        endTime: slot.end,
        location: item.title,
        image: item.image,
        color: 'var(--trip-base)',
        onCalendar: true,
      });
    });
  }

  return { days, activities };
}

export function ItineraryProvider({ children, tripId }: { children: React.ReactNode; tripId?: string }) {
  const { trip } = useItineraryScreen(tripId);

  // Generate initial data from trip context
  const generated = useMemo(() => {
    if (!trip) return null;
    const duration = trip.trip_context?.weather?.forecast?.length ?? 5;
    return generateFromTripContext(trip, duration);
  }, [trip]);

  const [activities, setActivities] = useState<CalendarActivity[]>([]);
  const [baseDays, setBaseDays] = useState<BaseDayData[]>([]);

  // Seed activities from trip context when trip loads (only once)
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (generated && !seeded && generated.days.length > 0) {
      setBaseDays(generated.days);
      setActivities(generated.activities);
      setSeeded(true);
    }
  }, [generated, seeded]);
  const [mapMarkers, setMapMarkers] = useState<MapLocation[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | undefined>();
  const [requestMapOpen, setRequestMapOpen] = useState(false);
  // Restore UI state from sessionStorage on mount
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = sessionStorage.getItem('itinerary-ui');
      return saved ? JSON.parse(saved).collapsedSections ?? {} : {};
    } catch { return {}; }
  });
  const [allCollapsedOverride, setAllCollapsedOverride] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem('itinerary-ui');
      return saved ? JSON.parse(saved).allCollapsedOverride ?? null : null;
    } catch { return null; }
  });
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = sessionStorage.getItem('itinerary-ui');
      return saved ? JSON.parse(saved).selectedDayIndex ?? 0 : 0;
    } catch { return 0; }
  });

  // Persist UI state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('itinerary-ui', JSON.stringify({
        collapsedSections,
        allCollapsedOverride,
        selectedDayIndex,
      }));
    } catch {}
  }, [collapsedSections, allCollapsedOverride, selectedDayIndex]);

  const days = useMemo(
    () => calendarActivitiesToDayViewModels(activities, baseDays),
    [activities, baseDays],
  );

  const addActivity = useCallback((activity: CalendarActivity) => {
    setActivities((prev) => [...prev, activity]);
  }, []);

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, onCalendar: false, parentId: undefined } : a,
      ),
    );
  }, []);

  const updateActivity = useCallback((id: string, updates: Partial<CalendarActivity>) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );
  }, []);

  const moveActivityBefore = useCallback((dragId: string, targetId: string) => {
    setActivities((prev) => {
      const dragIdx = prev.findIndex((a) => a.id === dragId);
      if (dragIdx < 0) return prev;
      const item = prev[dragIdx];
      const without = [...prev.slice(0, dragIdx), ...prev.slice(dragIdx + 1)];
      const targetIdx = without.findIndex((a) => a.id === targetId);
      if (targetIdx < 0) return prev;
      without.splice(targetIdx, 0, item);
      return without;
    });
  }, []);

  const value = useMemo(
    () => ({
      activities, setActivities, days, addActivity, removeActivity, updateActivity, moveActivityBefore,
      mapMarkers, setMapMarkers, selectedMarkerId, setSelectedMarkerId,
      requestMapOpen, setRequestMapOpen,
      collapsedSections, setCollapsedSections,
      allCollapsedOverride, setAllCollapsedOverride,
      selectedDayIndex, setSelectedDayIndex,
    }),
    [activities, days, addActivity, removeActivity, updateActivity, moveActivityBefore,
     mapMarkers, selectedMarkerId, requestMapOpen,
     collapsedSections, allCollapsedOverride, selectedDayIndex],
  );

  return (
    <ItineraryContext.Provider value={value}>
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItineraryContext() {
  const ctx = useContext(ItineraryContext);
  if (!ctx) throw new Error('useItineraryContext must be used within ItineraryProvider');
  return ctx;
}
