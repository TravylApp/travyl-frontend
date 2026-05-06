'use client';

import {
  Home, Calendar, CalendarDays, Plane, Building2, Compass,
  Luggage, PieChart, Heart, Car, Settings, History,
  MoreHorizontal, X,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTripTheme } from '@/components/trip/TripThemeContext';
import { useItineraryScreen } from '@travyl/shared';
import { HistoryPanel } from '@/components/trip/TripHistoryPanel';

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
  { segment: 'favorites',  label: 'Favorites',  subtitle: 'Saved places & activities',      icon: Heart,     color: DEFAULT_COLOR },
  { segment: 'settings',   label: 'Settings',   subtitle: 'Trip preferences & theme',       icon: Settings,  color: DEFAULT_COLOR },
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

// ── Types ────────────────────────────────────────────────────

export type RailVariant = 'light' | 'dark';

interface TripRailProps {
  tripId: string;
  variant?: RailVariant;
}

// ── Helpers ──────────────────────────────────────────────────

function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

function travelerCount(t: number | null | undefined): number {
  if (!t) return 1;
  return t;
}

function rowClasses(active: boolean, dark: boolean) {
  const base = 'relative flex items-center gap-[11px] h-8 px-2.5 rounded-[7px] my-px text-[13px] transition-colors';
  if (active) {
    const text = dark ? 'text-white font-semibold' : 'text-[var(--trip-base)] font-semibold';
    return `${base} ${text}`;
  }
  const text = dark ? 'text-white/70 font-medium' : 'text-gray-600 font-medium';
  const hover = dark ? 'hover:bg-white/10' : 'hover:bg-[#f5f3ee] hover:text-[var(--trip-base)]';
  return `${base} ${text} ${hover}`;
}

// ── Sub-components ───────────────────────────────────────────

function RailRow({
  href, label, Icon, active, tabColor, dark,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  tabColor: string;
  dark: boolean;
}) {
  const activeBg = active ? (dark ? `${tabColor}2E` : `${tabColor}14`) : undefined;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={rowClasses(active, dark)}
      style={active ? { backgroundColor: activeBg } : undefined}
    >
      {active && (
        <span aria-hidden className="absolute -left-[10px] top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r" style={{ backgroundColor: tabColor }} />
      )}
      <Icon size={16} strokeWidth={1.8} style={active ? { color: tabColor } : undefined} />
      <span>{label}</span>
    </Link>
  );
}

function RailRowButton({
  label, Icon, onClick, dark,
}: {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
  dark: boolean;
}) {
  return (
    <button onClick={onClick} className={rowClasses(false, dark) + ' w-full text-left'}>
      <Icon size={16} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  );
}

function RailDesktop({
  basePath, isActive, tabColorFor, dark, trip, onOpenHistory,
}: {
  basePath: string;
  isActive: (s: string) => boolean;
  tabColorFor: (s: string) => string;
  dark: boolean;
  trip: { destination?: string; start_date?: string | null; end_date?: string | null; travelers?: number | null } | null | undefined;
  onOpenHistory: () => void;
}) {
  const surface = dark
    ? 'bg-black/85 backdrop-blur-xl border-white/10'
    : 'bg-white border-gray-200';
  const headingColor = dark ? 'text-white' : 'text-[var(--trip-base)]';
  const metaColor = dark ? 'text-white/50' : 'text-gray-400';
  const count = travelerCount(trip?.travelers);
  const settingsTab = getTabMeta('settings')!;

  return (
    <aside
      className={`hidden md:flex flex-col fixed top-12 bottom-0 left-0 w-[220px] border-r ${surface} z-30`}
      aria-label="Trip navigation"
    >
      <div className={`px-4 pt-4 pb-3 border-b ${dark ? 'border-white/10' : 'border-[#f0eee9]'}`}>
        {trip ? (
          <>
            <div className={`font-serif text-[16px] leading-tight ${headingColor}`}>
              {trip.destination ?? 'Trip'}
            </div>
            <div className={`text-[11px] mt-1 ${metaColor}`}>
              {formatDateRange(trip.start_date, trip.end_date)}
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
            <div className={`h-4 w-32 rounded ${dark ? 'bg-white/10' : 'bg-gray-100'} animate-pulse`} />
            <div className={`h-3 w-24 rounded mt-2 ${dark ? 'bg-white/10' : 'bg-gray-100'} animate-pulse`} />
          </>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 py-2">
        {TAB_GROUPS.map((group, idx) => (
          <div key={group.id}>
            {idx > 0 && <div role="presentation" className={`h-px my-1.5 mx-3 ${dark ? 'bg-white/[0.06]' : 'bg-[#f0eee9]'}`} />}
            {group.segments.map((seg) => {
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
                />
              );
            })}
          </div>
        ))}
      </nav>
      <div className={`px-2.5 pt-1.5 pb-3 border-t ${dark ? 'border-white/10' : 'border-[#f0eee9]'}`}>
        <RailRow
          href={`${basePath}/settings`}
          label="Settings"
          Icon={settingsTab.icon}
          active={isActive('settings')}
          tabColor={tabColorFor('settings')}
          dark={dark}
        />
        <RailRowButton label="Trip History" Icon={History} onClick={onOpenHistory} dark={dark} />
      </div>
    </aside>
  );
}

// ── Mobile bottom bar ────────────────────────────────────────

const MOBILE_PRIMARY: string[] = ['', 'itinerary', 'hotels', 'flights', 'activities'];

function RailMobile({
  basePath, isActive, tabColorFor, onOpenHistory,
}: {
  basePath: string;
  isActive: (s: string) => boolean;
  tabColorFor: (s: string) => string;
  onOpenHistory: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryTabs = MOBILE_PRIMARY.map(seg => getTabMeta(seg)).filter((t): t is TabDef => Boolean(t));
  const overflowTabs = ALL_TABS.filter(t => !MOBILE_PRIMARY.includes(t.segment) && t.segment !== 'settings');
  const settingsTab = getTabMeta('settings')!;
  const SettingsIcon = settingsTab.icon;

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 dark:bg-black/85 backdrop-blur-xl border-t border-gray-200 dark:border-white/10">
        <div className="flex items-stretch h-12">
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
        </div>
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
              <div className="px-2 pb-4">
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
  const { theme, tabColorOverrides } = useTripTheme();
  const { trip } = useItineraryScreen(tripId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dark = variant === 'dark';

  const isActive = (segment: string) => {
    if (segment === '') return pathname === basePath;
    return pathname === `${basePath}/${segment}` || pathname.startsWith(`${basePath}/${segment}/`);
  };

  const tabColorFor = (segment: string) => {
    const key = segment || 'index';
    return tabColorOverrides[key] ?? theme.tabColors[key] ?? theme.base;
  };

  return (
    <>
      <RailDesktop
        basePath={basePath}
        isActive={isActive}
        tabColorFor={tabColorFor}
        dark={dark}
        trip={trip}
        onOpenHistory={() => setHistoryOpen(true)}
      />
      <RailMobile basePath={basePath} isActive={isActive} tabColorFor={tabColorFor} onOpenHistory={() => setHistoryOpen(true)} />
      <HistoryPanel tripId={tripId} isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
