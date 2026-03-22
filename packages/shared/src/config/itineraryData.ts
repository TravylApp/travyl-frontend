import { MOCK_DISCOVER_ACTIVITIES } from './mockItineraryData';
import type { DiscoverItem } from '../types';

// Navy and TAB_COLORS are now exported from colors.ts via config/index.ts

export const ITINERARY_COLORS = {
  primary: '#0ea5e9',    // sky blue — section headers
  primaryLight: '#e0f2fe',
  primaryMedium: '#7dd3fc',
  primaryDark: '#0284c7',
  containerBg: '#f0f9ff',
} as const;

// ─── Time-of-Day Section Colors ─────────────────────────────
export const TIME_OF_DAY_CONFIG = {
  morning: {
    icon: 'sun',
    label: 'Morning',
    bg: '#eff6ff',
    border: '#dbeafe',
    text: '#1e40af',
    iconColor: '#2563eb',
  },
  afternoon: {
    icon: 'sunset',
    label: 'Afternoon',
    bg: '#fef3c7',
    border: '#fde68a',
    text: '#92400e',
    iconColor: '#d97706',
  },
  evening: {
    icon: 'moon',
    label: 'Evening',
    bg: '#ede9fe',
    border: '#ddd6fe',
    text: '#5b21b6',
    iconColor: '#7c3aed',
  },
  latenight: {
    icon: 'sparkles',
    label: 'Late Night',
    bg: '#ecfeff',
    border: '#a5f3fc',
    text: '#155e75',
    iconColor: '#1e3a5f',
  },
} as const;

// ─── Activity Type Colors ───────────────────────────────────
export const ACTIVITY_TYPE_COLORS: Record<string, { primary: string; bg: string; border: string }> = {
  landmark:    { primary: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  sightseeing: { primary: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  food:        { primary: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  dining:      { primary: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  tour:        { primary: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
  activity:    { primary: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  outdoor:     { primary: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  cultural:    { primary: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  nightlife:   { primary: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' },
  shopping:    { primary: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  transport:   { primary: '#6366f1', bg: '#eef2ff', border: '#e0e7ff' },
  wellness:    { primary: '#14b8a6', bg: '#f0fdfa', border: '#99f6e4' },
  hotel:       { primary: '#60a5fa', bg: '#eff6ff', border: '#bfdbfe' },
  default:     { primary: '#1e3a5f', bg: '#f0f4f8', border: '#d1d5db' },
};

export function getActivityTypeColor(slug: string) {
  return ACTIVITY_TYPE_COLORS[slug] ?? ACTIVITY_TYPE_COLORS.default;
}

// ─── Legacy aliases ─────────────────────────────────────────
export const ACTIVITY_CATEGORY_COLORS = ACTIVITY_TYPE_COLORS;
export const getActivityCategoryColor = getActivityTypeColor;

// ─── Time-of-Day Hours (used by glance pager) ──────────────
export const TOD_START_TIMES: Record<string, string> = {
  morning: '9:00 AM', afternoon: '2:00 PM', evening: '7:00 PM', latenight: '10:00 PM',
};

export const TOD_START_HOURS: Record<string, number> = {
  morning: 9, afternoon: 14, evening: 19, latenight: 22,
};

export const TOD_END_HOURS: Record<string, number> = {
  morning: 13, afternoon: 18, evening: 21, latenight: 24,
};

// ─── Quick-Fill Categories ──────────────────────────────────
export const QUICK_FILL_CATEGORIES = [
  { label: 'Random', icon: '🎲', filter: null },
  { label: 'Culture', icon: '🎨', filter: 'museum' },
  { label: 'Food', icon: '🍽', filter: 'dining' },
  { label: 'Sights', icon: '🏛', filter: 'sightseeing' },
  { label: 'Tours', icon: '🗺', filter: 'tour' },
  { label: 'Nature', icon: '🌿', filter: 'nature' },
  { label: 'Events', icon: '🎉', filter: 'event' },
] as const;

// ─── Activity Type Icons (FontAwesome names) ────────────────
export const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  sightseeing: 'university',
  landmark: 'university',
  museum: 'paint-brush',
  dining: 'cutlery',
  food: 'cutlery',
  tour: 'binoculars',
  outdoor: 'tree',
  nature: 'leaf',
  cultural: 'paint-brush',
  shopping: 'shopping-bag',
  nightlife: 'moon-o',
  wellness: 'heart',
  transport: 'bus',
  default: 'map-marker',
};

// ─── Shared Utilities ───────────────────────────────────────
export function formatHourToTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function pickRandomActivity(category: string | null, excludeIds: string[]): DiscoverItem | null {
  let pool = MOCK_DISCOVER_ACTIVITIES.filter((a) => !excludeIds.includes(a.id));
  if (category) {
    const filtered = pool.filter((a) => a.category?.toLowerCase().includes(category));
    if (filtered.length > 0) pool = filtered;
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
