'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { CalendarActivity } from '@travyl/shared';
import type { ItineraryDayViewModel, ActivityViewModel, TimeGroup } from '@travyl/shared';
import { MOCK_CALENDAR_ACTIVITIES, MOCK_DAYS } from '@travyl/shared';
import type { MapLocation } from '@/components/leaflet-map';

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
    startTime: a.startTime,
    endTime: a.endTime,
    timeDisplay: `${a.startTime} – ${a.endTime}`,
    costDisplay: a.price ?? null,
    bookingUrl: null,
    notes: null,
    source: 'user',
    timeOfDay: getTimeOfDay(a.startHour),
  };
}

function calendarActivitiesToDayViewModels(
  activities: CalendarActivity[],
  baseDays: typeof MOCK_DAYS,
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
      theme: baseDay.theme,
      notes: baseDay.notes,
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

export function ItineraryProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<CalendarActivity[]>(MOCK_CALENDAR_ACTIVITIES);
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
    () => calendarActivitiesToDayViewModels(activities, MOCK_DAYS),
    [activities],
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

  const value = useMemo(
    () => ({
      activities, setActivities, days, addActivity, removeActivity, updateActivity,
      mapMarkers, setMapMarkers, selectedMarkerId, setSelectedMarkerId,
      requestMapOpen, setRequestMapOpen,
      collapsedSections, setCollapsedSections,
      allCollapsedOverride, setAllCollapsedOverride,
      selectedDayIndex, setSelectedDayIndex,
    }),
    [activities, days, addActivity, removeActivity, updateActivity,
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
