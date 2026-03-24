"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, CalendarDays, BookOpen, Plane, Building2, UtensilsCrossed,
  Compass, Luggage, PieChart, Heart, Car, Settings,
  SlidersHorizontal, Check, X,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useTripTheme } from "@/components/trip/TripThemeContext";

// ─── Tab Configuration ──────────────────────────────────────

interface TabDef {
  segment: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
}

const DEFAULT_COLOR = '#1e3a5f';

const ALL_TABS: TabDef[] = [
  { segment: "",             label: "Overview",      subtitle: "Trip overview & info",               icon: Home,              color: DEFAULT_COLOR },
  { segment: "itinerary",   label: "Itinerary",     subtitle: "Your day-by-day travel plan",        icon: BookOpen,          color: DEFAULT_COLOR },
  { segment: "calendar",    label: "Calendar",      subtitle: "Visual calendar & For You",          icon: CalendarDays,      color: DEFAULT_COLOR },
  { segment: "hotels",      label: "Hotels",        subtitle: "Accommodation & stays",              icon: Building2,         color: DEFAULT_COLOR },
  { segment: "flights",     label: "Flights",       subtitle: "Flight bookings & details",          icon: Plane,             color: DEFAULT_COLOR },
  { segment: "restaurants", label: "Restaurants",   subtitle: "Dining reservations & discoveries",  icon: UtensilsCrossed,   color: DEFAULT_COLOR },
  { segment: "activities",  label: "Explore",       subtitle: "Activities, tours & events",         icon: Compass,           color: DEFAULT_COLOR },
  { segment: "packing",     label: "Packing",       subtitle: "What to bring",                      icon: Luggage,           color: DEFAULT_COLOR },
  { segment: "budget",      label: "Budget",        subtitle: "Trip expenses & spending",           icon: PieChart,          color: DEFAULT_COLOR },
  { segment: "cars",        label: "Car Rental",    subtitle: "Vehicle rentals & transport",        icon: Car,               color: DEFAULT_COLOR },
  { segment: "favorites",   label: "Favorites",     subtitle: "Saved places & activities",          icon: Heart,             color: DEFAULT_COLOR },
  { segment: "settings",    label: "Settings",      subtitle: "Trip preferences & theme",           icon: Settings,          color: DEFAULT_COLOR },
];

// ─── Exports for content header ─────────────────────────────

export function getTabMeta(segment: string): TabDef | undefined {
  return ALL_TABS.find((t) => t.segment === segment);
}

export type SpinePosition = "left";

// ─── Quick Color Swatches ───────────────────────────────────

const QUICK_COLORS = [
  '#1e3a5f', '#0e7490', '#3b82f6', '#0891b2',
  '#10b981', '#15803d', '#f59e0b', '#f97316',
  '#ef4444', '#e11d48', '#8b5cf6', '#7c3aed',
  '#6366f1', '#1f2937', '#9a3412', '#c2410c',
];

// ─── Tab Customize Popover ──────────────────────────────────

function TabCustomizePopover({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme, tabColorOverrides, setTabColor } = useTripTheme();
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute left-full ml-2 bottom-10 z-50 w-64 bg-white dark:bg-[#1a2230] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
      style={{ maxHeight: 420 }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Customize Tabs</span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <X size={11} className="text-gray-400" />
        </button>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {ALL_TABS.map(({ segment, label, icon: Icon }) => {
          const key = segment || 'index';
          const tabColor = tabColorOverrides[key] ?? theme.tabColors[key] ?? theme.base;
          const isEditingThis = editingColor === key;
          return (
            <div key={key}>
              <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors">
                <button
                  onClick={() => setEditingColor(isEditingThis ? null : key)}
                  className="w-5 h-5 rounded-md shrink-0 transition-all hover:scale-110"
                  style={{
                    backgroundColor: tabColor,
                    boxShadow: isEditingThis ? `0 0 0 2px white, 0 0 0 3px ${tabColor}` : 'none',
                  }}
                  title="Change color"
                />
                <Icon size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <span className="text-[12px] text-gray-700 dark:text-gray-300 flex-1">{label}</span>
              </div>
              {isEditingThis && (
                <div className="px-3 pb-2.5 pt-0.5">
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setTabColor(key, color)}
                        className="w-5 h-5 rounded-md transition-all hover:scale-110"
                        style={{
                          backgroundColor: color,
                          boxShadow: tabColor === color ? `0 0 0 1.5px white, 0 0 0 3px ${color}` : 'none',
                        }}
                      >
                        {tabColor === color && <Check size={8} className="text-white mx-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

const COLLAPSED_WIDTH = 52;
const EXPANDED_WIDTH = 220;
const COLLAPSE_DELAY = 200;

export default function TripTabs({
  tripId,
  dark = false,
}: {
  tripId: string;
  position?: SpinePosition;
  onPositionChange?: (pos: SpinePosition) => void;
  dark?: boolean;
}) {
  const pathname = usePathname();
  const basePath = `/trip/${tripId}`;
  const { theme, tabColorOverrides } = useTripTheme();

  const [expanded, setExpanded] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeCustomize = useCallback(() => setCustomizeOpen(false), []);

  function handleMouseEnter() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    setExpanded(true);
  }

  function handleMouseLeave() {
    collapseTimer.current = setTimeout(() => setExpanded(false), COLLAPSE_DELAY);
  }

  function isActive(segment: string) {
    if (segment === "") return pathname === basePath;
    return pathname === `${basePath}/${segment}`;
  }

  function getTabColor(segment: string) {
    const key = segment || 'index';
    return tabColorOverrides[key] ?? theme.tabColors[key] ?? theme.base;
  }

  const textOnBase = theme.textOnBase;

  // Mobile: horizontal scroll bar
  const mobileBar = (
    <div className="md:hidden overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-white/[0.06]">
      <div className="flex items-center gap-[2px] p-[2px]">
        {ALL_TABS.map(({ segment, label, icon: Icon }) => {
          const active = isActive(segment);
          const href = segment ? `${basePath}/${segment}` : basePath;
          const tabColor = getTabColor(segment);
          return (
            <Link
              key={segment}
              href={href}
              className="flex items-center justify-center gap-1.5 shrink-0 h-[44px] px-3 transition-colors duration-200"
              style={{
                backgroundColor: active ? tabColor : tabColor + '18',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              }}
            >
              <Icon
                size={16}
                style={{ color: active ? textOnBase : tabColor }}
              />
              <span
                className="text-[11px] whitespace-nowrap"
                style={{
                  fontWeight: active ? 600 : 400,
                  color: active ? textOnBase : tabColor,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  // Desktop: hover-expand vertical sidebar
  const desktopSidebar = (
    <motion.nav
      animate={{ width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="hidden md:flex flex-col shrink-0 self-stretch overflow-hidden relative"
      style={{
        borderRight: '1px solid',
        borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        backgroundColor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
      }}
      aria-label="Trip navigation"
    >
      <ul className="flex flex-col gap-0.5 p-2 mt-2">
        {ALL_TABS.map(({ segment, label, icon: Icon }) => {
          const active = isActive(segment);
          const href = segment ? `${basePath}/${segment}` : basePath;
          const tabColor = getTabColor(segment);

          return (
            <li key={segment}>
              <Link
                href={href}
                title={!expanded ? label : undefined}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors duration-200 group"
                style={{
                  backgroundColor: active
                    ? tabColor
                    : dark
                      ? tabColor + '30'
                      : tabColor + '12',
                  ...(active ? { boxShadow: `0 0 8px ${tabColor}30` } : {}),
                }}
              >
                <span className="shrink-0">
                  <Icon
                    size={18}
                    strokeWidth={1.5}
                    style={{
                      color: active
                        ? textOnBase
                        : dark
                          ? 'rgba(255,255,255,0.7)'
                          : tabColor,
                    }}
                    aria-hidden="true"
                  />
                </span>
                {expanded && (
                  <span
                    className="whitespace-nowrap overflow-hidden text-ellipsis text-[13px]"
                    style={{
                      color: active
                        ? textOnBase
                        : dark
                          ? 'rgba(255,255,255,0.7)'
                          : tabColor,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex-1" />

      {/* Customize button */}
      <div className="p-2 relative">
        <button
          onClick={() => setCustomizeOpen((v) => !v)}
          title="Customize tabs"
          className="flex items-center justify-center w-full rounded-lg transition-all duration-200 hover:opacity-80"
          style={{
            backgroundColor: dark ? 'rgba(255,255,255,0.05)' : theme.base + '15',
            height: 30,
          }}
        >
          <SlidersHorizontal
            size={11}
            style={{ color: dark ? 'rgba(255,255,255,0.25)' : theme.base + '80' }}
          />
        </button>
        <TabCustomizePopover open={customizeOpen} onClose={closeCustomize} />
      </div>
    </motion.nav>
  );

  return (
    <>
      {mobileBar}
      {desktopSidebar}
    </>
  );
}
