'use client';

import {
  Home, Calendar, CalendarDays, Plane, Building2, Compass,
  Luggage, PieChart, Car, Settings, History,
  MoreHorizontal, X, ChevronLeft, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTripTheme } from '@/components/trip/TripThemeContext';
import { useItineraryScreen, formatDateRange } from '@travyl/shared';
import { HistoryPanel } from '@/components/trip/TripHistoryPanel';

// ── Collapsed state — localStorage + custom event for cross-component sync ──

const RAIL_COLLAPSED_KEY = 'travyl-trip-rail-collapsed';
const RAIL_COLLAPSED_EVENT = 'trip-rail-collapsed-change';

export function useRailCollapsed(): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        setCollapsed(localStorage.getItem(RAIL_COLLAPSED_KEY) === '1');
      } catch {
        setCollapsed(false);
      }
    };
    read();
    window.addEventListener(RAIL_COLLAPSED_EVENT, read);
    return () => window.removeEventListener(RAIL_COLLAPSED_EVENT, read);
  }, []);

  const toggle = useCallback((next: boolean) => {
    try { localStorage.setItem(RAIL_COLLAPSED_KEY, next ? '1' : '0'); } catch { /* private mode */ }
    setCollapsed(next);
    window.dispatchEvent(new Event(RAIL_COLLAPSED_EVENT));
  }, []);

  return [collapsed, toggle];
}

export interface TabDef {
  segment: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
}

const DEFAULT_COLOR = '#1e3a5f';

export const ALL_TABS: TabDef[] = [
  { segment: '',           label: 'Overview',   subtitle: 'Trip overview & info',           icon: Home,      color: DEFAULT_COLOR },
  { segment: 'itinerary',  label: 'Itinerary',  subtitle: 'Your day-by-day travel plan',    icon: Calendar,  color: DEFAULT_COLOR },
  { segment: 'calendar',   label: 'Calendar',   subtitle: 'Visual calendar & For You',      icon: CalendarDays, color: DEFAULT_COLOR },
  { segment: 'hotels',     label: 'Hotels',     subtitle: 'Accommodation & stays',          icon: Building2, color: DEFAULT_COLOR },
  { segment: 'flights',    label: 'Flights',    subtitle: 'Flight bookings & details',      icon: Plane,     color: DEFAULT_COLOR },
  { segment: 'cars',       label: 'Cars',       subtitle: 'Vehicle rentals & transport',    icon: Car,       color: DEFAULT_COLOR },
  { segment: 'activities', label: 'Explore',    subtitle: 'Restaurants, activities & more', icon: Compass,   color: DEFAULT_COLOR },
  { segment: 'packing',    label: 'Packing',    subtitle: 'What to bring',                  icon: Luggage,   color: DEFAULT_COLOR },
  { segment: 'budget',     label: 'Budget',     subtitle: 'Trip expenses & spending',       icon: PieChart,  color: DEFAULT_COLOR },
  { segment: 'settings',   label: 'Settings',   subtitle: 'Trip preferences & theme',       icon: Settings,  color: DEFAULT_COLOR },
];

export interface TabGroup {
  id: 'plan' | 'book' | 'explore';
  segments: string[];
}

export const TAB_GROUPS: TabGroup[] = [
  { id: 'plan',    segments: ['', 'itinerary', 'calendar'] },
  { id: 'book',    segments: ['hotels', 'flights', 'cars'] },
  { id: 'explore', segments: ['activities', 'packing', 'budget'] },
];

export function getTabMeta(segment: string): TabDef | undefined {
  return ALL_TABS.find((t) => t.segment === segment);
}

// ── Types ────────────────────────────────────────────────────

export type RailVariant = 'light' | 'dark';

interface TripRailProps {
  tripId: string;
  variant?: RailVariant;
}

// ── Helpers ──────────────────────────────────────────────────

function travelerCount(t: number | null | undefined): number {
  if (t == null) return 1;
  return t;
}

function rowClasses(active: boolean, dark: boolean, collapsed: boolean) {
  const base = collapsed
    ? 'relative flex items-center justify-center h-8 w-8 mx-auto rounded-[7px] my-px transition-colors'
    : 'relative flex items-center gap-[11px] h-8 px-2.5 rounded-[7px] my-px text-[13px] transition-colors';
  if (active) {
    const text = dark ? 'text-white font-semibold' : 'text-[var(--trip-base)] dark:text-white font-semibold';
    return `${base} ${text}`;
  }
  const text = dark ? 'text-white/70 font-medium' : 'text-gray-600 dark:text-white/70 font-medium';
  const hover = dark
    ? 'hover:bg-white/10'
    : 'hover:bg-[#f5f3ee] hover:text-[var(--trip-base)] dark:hover:bg-white/5 dark:hover:text-white';
  return `${base} ${text} ${hover}`;
}

// ── Sub-components ───────────────────────────────────────────

function RailRow({
  href, label, Icon, active, tabColor, dark, collapsed,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  tabColor: string;
  dark: boolean;
  collapsed: boolean;
}) {
  const activeBg = active ? (dark ? `${tabColor}2E` : `${tabColor}14`) : undefined;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={rowClasses(active, dark, collapsed)}
      style={active ? { backgroundColor: activeBg } : undefined}
    >
      {active && (
        <span aria-hidden className={`absolute ${collapsed ? '-left-[6px]' : '-left-[10px]'} top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r`} style={{ backgroundColor: tabColor }} />
      )}
      <Icon size={16} strokeWidth={1.8} style={active ? { color: tabColor } : undefined} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function RailRowButton({
  label, Icon, onClick, dark, collapsed,
}: {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
  dark: boolean;
  collapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={rowClasses(false, dark, collapsed) + (collapsed ? '' : ' w-full text-left')}
    >
      <Icon size={16} strokeWidth={1.8} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function RailDesktop({
  basePath, isActive, tabColorFor, isTabHidden, dark, trip, onOpenHistory, collapsed, onToggleCollapsed,
}: {
  basePath: string;
  isActive: (s: string) => boolean;
  tabColorFor: (s: string) => string;
  isTabHidden: (s: string) => boolean;
  dark: boolean;
  trip: { destination?: string; start_date?: string | null; end_date?: string | null; travelers?: number | null } | null | undefined;
  onOpenHistory: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const surface = dark
    ? 'bg-black/85 backdrop-blur-xl border-white/10'
    : 'bg-white dark:bg-[#0c1117] border-gray-200 dark:border-white/[0.08]';
  const headingColor = dark ? 'text-white' : 'text-[var(--trip-base)] dark:text-white';
  const metaColor = dark ? 'text-white/50' : 'text-gray-400 dark:text-white/50';
  const count = travelerCount(trip?.travelers);
  const settingsTab = getTabMeta('settings')!;

  return (
    <aside
      className={`hidden md:flex flex-col fixed top-12 bottom-0 left-0 ${collapsed ? 'w-[56px]' : 'w-[220px]'} transition-[width] duration-200 ease-out border-r ${surface} z-30`}
      aria-label="Trip navigation"
    >
      {!collapsed && (
        <div className={`px-4 pt-4 pb-3 border-b ${dark ? 'border-white/10' : 'border-[#f0eee9] dark:border-white/[0.08]'}`}>
          {trip ? (
            <>
              <div className={`font-serif text-[16px] leading-tight ${headingColor}`}>
                {trip.destination ?? 'Trip'}
              </div>
              <div className={`text-[11px] mt-1 ${metaColor}`}>
                {trip.start_date && trip.end_date ? formatDateRange(trip.start_date, trip.end_date) : ''}
                {count > 0 && (
                  <>
                    <span className="mx-1.5">·</span>
                    {count} {count === 1 ? 'traveler' : 'travelers'}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className={`h-4 w-32 rounded ${dark ? 'bg-white/10' : 'bg-gray-100 dark:bg-white/10'} animate-pulse`} />
              <div className={`h-3 w-24 rounded mt-2 ${dark ? 'bg-white/10' : 'bg-gray-100 dark:bg-white/10'} animate-pulse`} />
            </>
          )}
        </div>
      )}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-1.5 py-2' : 'px-2.5 py-2'}`}>
        {TAB_GROUPS.map((group, idx) => {
          const visibleSegments = group.segments.filter((s) => !isTabHidden(s));
          if (visibleSegments.length === 0) return null;
          return (
          <div key={group.id}>
            {idx > 0 && <div role="presentation" className={`h-px my-1.5 mx-3 ${dark ? 'bg-white/[0.06]' : 'bg-[#f0eee9] dark:bg-white/[0.06]'}`} />}
            {visibleSegments.map((seg) => {
              const tab = getTabMeta(seg);
              if (!tab) return null;
              return (
                <RailRow
                  key={seg || 'overview'}
                  href={seg ? `${basePath}/${seg}` : basePath}
                  label={tab.label}
                  Icon={tab.icon}
                  active={isActive(seg)}
                  tabColor={tabColorFor(seg)}
                  dark={dark}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
          );
        })}
      </nav>
      <div className={`${collapsed ? 'px-1.5' : 'px-2.5'} pt-1.5 pb-2 border-t ${dark ? 'border-white/10' : 'border-[#f0eee9] dark:border-white/[0.08]'}`}>
        <RailRow
          href={`${basePath}/settings`}
          label="Settings"
          Icon={settingsTab.icon}
          active={isActive('settings')}
          tabColor={tabColorFor('settings')}
          dark={dark}
          collapsed={collapsed}
        />
        <RailRowButton label="Trip History" Icon={History} onClick={onOpenHistory} dark={dark} collapsed={collapsed} />
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`${
            collapsed
              ? 'flex items-center justify-center h-7 w-8 mx-auto mt-1.5 rounded-md'
              : 'flex items-center justify-end gap-1.5 w-full h-7 px-2.5 mt-1.5 rounded-md text-[11px]'
          } transition-colors ${
            dark ? 'text-white/40 hover:text-white/70 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-[#f5f3ee] dark:text-white/40 dark:hover:text-white/70 dark:hover:bg-white/10'
          }`}
        >
          {!collapsed && <span>Collapse</span>}
          {collapsed ? <ChevronRight size={14} strokeWidth={2} /> : <ChevronLeft size={14} strokeWidth={2} />}
        </button>
      </div>
    </aside>
  );
}

// ── Mobile bottom bar ────────────────────────────────────────

const MOBILE_PRIMARY: string[] = ['', 'itinerary', 'hotels', 'flights', 'activities'];

function RailMobile({
  basePath, isActive, tabColorFor, isTabHidden, onOpenHistory,
}: {
  basePath: string;
  isActive: (s: string) => boolean;
  tabColorFor: (s: string) => string;
  isTabHidden: (s: string) => boolean;
  onOpenHistory: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryTabs = MOBILE_PRIMARY
    .filter((seg) => !isTabHidden(seg))
    .map(seg => getTabMeta(seg)).filter((t): t is TabDef => Boolean(t));
  const overflowTabs = ALL_TABS.filter(t => !MOBILE_PRIMARY.includes(t.segment) && t.segment !== 'settings' && !isTabHidden(t.segment));
  const settingsTab = getTabMeta('settings')!;
  const SettingsIcon = settingsTab.icon;

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 dark:bg-black/85 backdrop-blur-xl border-t border-gray-200 dark:border-white/10">
        <nav aria-label="Trip navigation" className="flex items-stretch h-12">
          {primaryTabs.map((tab) => {
            const active = isActive(tab.segment);
            const color = tabColorFor(tab.segment);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.segment || 'overview'}
                href={tab.segment ? `${basePath}/${tab.segment}` : basePath}
                aria-current={active ? 'page' : undefined}
                className="flex-1 flex flex-col items-center justify-center gap-0.5"
                style={active ? { color } : undefined}
              >
                <Icon size={18} strokeWidth={1.8} className={active ? '' : 'text-gray-400'} />
                <span className={`text-[10px] ${active ? 'font-semibold' : 'text-gray-400 font-medium'}`}>{tab.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400"
            aria-label="More tabs"
          >
            <MoreHorizontal size={18} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="more-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden fixed inset-0 bg-black/40 z-50"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              key="more-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) setMoreOpen(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[60vh] bg-white dark:bg-[var(--background)] rounded-t-2xl shadow-2xl"
            >
              <div role="presentation" className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
              </div>
              <div className="flex items-center justify-between px-4 pt-1 pb-2">
                <span className="text-[14px] font-semibold text-gray-900 dark:text-white">More</span>
                <button onClick={() => setMoreOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              <div className="px-2 pb-4 overflow-y-auto">
                {overflowTabs.map((tab) => {
                  const active = isActive(tab.segment);
                  const color = tabColorFor(tab.segment);
                  const Icon = tab.icon;
                  return (
                    <Link
                      key={tab.segment}
                      href={tab.segment ? `${basePath}/${tab.segment}` : basePath}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 px-3 h-11 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-[14px] text-gray-700 dark:text-gray-200"
                      style={active ? { color, backgroundColor: `${color}14`, fontWeight: 600 } : undefined}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      <span>{tab.label}</span>
                    </Link>
                  );
                })}
                <div role="presentation" className="h-px bg-gray-100 dark:bg-white/10 my-1.5 mx-3" />
                <Link
                  href={`${basePath}/settings`}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 h-11 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-[14px] text-gray-700 dark:text-gray-200"
                >
                  <SettingsIcon size={18} strokeWidth={1.8} />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={() => { setMoreOpen(false); onOpenHistory(); }}
                  className="flex items-center gap-3 px-3 h-11 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-[14px] text-gray-700 dark:text-gray-200 w-full text-left"
                >
                  <History size={18} strokeWidth={1.8} />
                  <span>Trip History</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Default export ───────────────────────────────────────────

export default function TripRail({ tripId, variant = 'light' }: TripRailProps) {
  const pathname = usePathname();
  const basePath = `/trip/${tripId}`;
  const { theme, tabColorOverrides, hiddenTabs } = useTripTheme();
  const { trip } = useItineraryScreen(tripId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [collapsed, setCollapsed] = useRailCollapsed();
  const dark = variant === 'dark';

  const isActive = (segment: string) => {
    if (segment === '') return pathname === basePath;
    return pathname === `${basePath}/${segment}` || pathname.startsWith(`${basePath}/${segment}/`);
  };

  const tabColorFor = (segment: string) => {
    const key = segment || 'index';
    return tabColorOverrides[key] ?? theme.tabColors[key] ?? theme.base;
  };

  // Settings page stores hidden tabs under 'overview' for the empty (root) segment.
  const isTabHidden = (segment: string) => {
    const key = segment || 'overview';
    return Boolean(hiddenTabs[key]);
  };

  return (
    <>
      <RailDesktop
        basePath={basePath}
        isActive={isActive}
        tabColorFor={tabColorFor}
        isTabHidden={isTabHidden}
        dark={dark}
        trip={trip}
        onOpenHistory={() => setHistoryOpen(true)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
      />
      <RailMobile basePath={basePath} isActive={isActive} tabColorFor={tabColorFor} isTabHidden={isTabHidden} onOpenHistory={() => setHistoryOpen(true)} />
      <HistoryPanel tripId={tripId} isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
