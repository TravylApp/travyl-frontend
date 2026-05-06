'use client';

import {
  Home, Calendar, CalendarDays, Plane, Building2, Compass,
  Luggage, PieChart, Heart, Car, Settings,
  type LucideIcon,
} from 'lucide-react';

export interface TabDef {
  segment: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
}

export const ALL_TABS: TabDef[] = [
  { segment: '',           label: 'Overview',   subtitle: 'Trip overview & info',           icon: Home },
  { segment: 'itinerary',  label: 'Itinerary',  subtitle: 'Your day-by-day travel plan',    icon: Calendar },
  { segment: 'calendar',   label: 'Calendar',   subtitle: 'Visual calendar & For You',      icon: CalendarDays },
  { segment: 'hotels',     label: 'Hotels',     subtitle: 'Accommodation & stays',          icon: Building2 },
  { segment: 'flights',    label: 'Flights',    subtitle: 'Flight bookings & details',      icon: Plane },
  { segment: 'cars',       label: 'Cars',       subtitle: 'Vehicle rentals & transport',    icon: Car },
  { segment: 'activities', label: 'Explore',    subtitle: 'Restaurants, activities & more', icon: Compass },
  { segment: 'packing',    label: 'Packing',    subtitle: 'What to bring',                  icon: Luggage },
  { segment: 'budget',     label: 'Budget',     subtitle: 'Trip expenses & spending',       icon: PieChart },
  { segment: 'favorites',  label: 'Favorites',  subtitle: 'Saved places & activities',      icon: Heart },
  { segment: 'settings',   label: 'Settings',   subtitle: 'Trip preferences & theme',       icon: Settings },
];

export interface TabGroup {
  id: 'plan' | 'book' | 'explore';
  segments: string[];
}

export const TAB_GROUPS: TabGroup[] = [
  { id: 'plan',    segments: ['', 'itinerary', 'calendar'] },
  { id: 'book',    segments: ['hotels', 'flights', 'cars'] },
  { id: 'explore', segments: ['activities', 'packing', 'budget', 'favorites'] },
];

export function getTabMeta(segment: string): TabDef | undefined {
  return ALL_TABS.find((t) => t.segment === segment);
}
