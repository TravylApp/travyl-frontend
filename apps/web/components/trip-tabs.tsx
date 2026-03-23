"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Calendar, CalendarDays, Plane, Building2, UtensilsCrossed, Compass,
  Luggage, PieChart, Heart, Car, Settings,
  GripVertical, GripHorizontal,
  SlidersHorizontal, Check, X,
  type LucideIcon,
} from "lucide-react";
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
  { segment: "itinerary",   label: "Itinerary",     subtitle: "Your day-by-day travel plan",        icon: Calendar,          color: DEFAULT_COLOR },
  { segment: "calendar",    label: "Calendar",      subtitle: "Visual calendar & For You",          icon: CalendarDays,      color: DEFAULT_COLOR },
  { segment: "hotels",      label: "Hotels",        subtitle: "Accommodation & stays",              icon: Building2,         color: DEFAULT_COLOR },
  { segment: "flights",     label: "Flights",       subtitle: "Flight bookings & details",          icon: Plane,             color: DEFAULT_COLOR },
  { segment: "restaurants", label: "Restaurants",    subtitle: "Dining reservations & discoveries",  icon: UtensilsCrossed,   color: DEFAULT_COLOR },
  { segment: "activities",  label: "Explore",       subtitle: "Activities, tours & events",         icon: Compass,           color: DEFAULT_COLOR },
  { segment: "packing",     label: "Packing",       subtitle: "What to bring",                      icon: Luggage,           color: DEFAULT_COLOR },
  { segment: "budget",      label: "Budget",        subtitle: "Trip expenses & spending",            icon: PieChart,          color: DEFAULT_COLOR },
  { segment: "cars",        label: "Car Rental",    subtitle: "Vehicle rentals & transport",         icon: Car,               color: DEFAULT_COLOR },
  { segment: "favorites",   label: "Favorites",     subtitle: "Saved places & activities",           icon: Heart,             color: DEFAULT_COLOR },
  { segment: "settings",   label: "Settings",      subtitle: "Trip preferences & theme",            icon: Settings,          color: DEFAULT_COLOR },
];

// ─── Spine Position ─────────────────────────────────────────

export type SpinePosition = "left" | "right" | "top";

// Drag handle hook — track pointer movement to infer desired position
function useDragToReposition(onPositionChange?: (pos: SpinePosition) => void) {
  const dragRef = useRef<HTMLDivElement>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    startPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPos.current || !onPositionChange) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const threshold = 25;

    // Vertical drag → top position
    if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
      onPositionChange("top");
      startPos.current = null;
    }
    // Horizontal drag → left or right
    else if (Math.abs(dx) > threshold) {
      onPositionChange(dx < 0 ? "left" : "right");
      startPos.current = null;
    }
  }, [onPositionChange]);

  const onPointerUp = useCallback(() => {
    startPos.current = null;
  }, []);

  return { dragRef, onPointerDown, onPointerMove, onPointerUp };
}

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
  anchorSide,
}: {
  open: boolean;
  onClose: () => void;
  anchorSide: 'left' | 'right' | 'bottom';
}) {
  const { theme, tabColorOverrides, setTabColor } = useTripTheme();
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
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

  const positionClass =
    anchorSide === 'left'
      ? 'left-full ml-2 top-0'
      : anchorSide === 'right'
        ? 'right-full mr-2 top-0'
        : 'top-full mt-2 right-0';

  return (
    <div
      ref={panelRef}
      className={`absolute ${positionClass} z-50 w-64 bg-white dark:bg-[#1a2230] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden`}
      style={{ maxHeight: 420 }}
    >
      {/* Header */}
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

      {/* Tab list */}
      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {ALL_TABS.map(({ segment, label, icon: Icon }) => {
          const key = segment || 'index';
          const tabColor = tabColorOverrides[key] ?? theme.tabColors[key] ?? theme.base;
          const isEditingThis = editingColor === key;

          return (
            <div key={key}>
              <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors">
                {/* Color dot — click to edit */}
                <button
                  onClick={() => setEditingColor(isEditingThis ? null : key)}
                  className="w-5 h-5 rounded-md shrink-0 transition-all hover:scale-110"
                  style={{
                    backgroundColor: tabColor,
                    boxShadow: isEditingThis ? `0 0 0 2px white, 0 0 0 3px ${tabColor}` : 'none',
                  }}
                  title="Change color"
                />

                {/* Icon + Label */}
                <Icon size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <span className="text-[12px] text-gray-700 dark:text-gray-300 flex-1">{label}</span>
              </div>

              {/* Inline color swatches */}
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

// ─── Exports for content header ─────────────────────────────

export function getTabMeta(segment: string): TabDef | undefined {
  return ALL_TABS.find((t) => t.segment === segment);
}

// ─── Component ──────────────────────────────────────────────

export default function TripTabs({
  tripId,
  position = "left",
  onPositionChange,
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

  const textOnBase = theme.textOnBase;

  const getTabColor = (segment: string) => {
    const key = segment || 'index';
    return tabColorOverrides[key] ?? theme.tabColors[key] ?? theme.base;
  };

  function isActive(segment: string) {
    if (segment === "") return pathname === basePath;
    return pathname === `${basePath}/${segment}`;
  }

  // Show all tabs — no filtering
  const visibleTabs = ALL_TABS;

  const { onPointerDown, onPointerMove, onPointerUp } = useDragToReposition(onPositionChange);

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const closeCustomize = useCallback(() => setCustomizeOpen(false), []);

  // Long-press to open customize popover
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const startLongPress = useCallback(() => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setCustomizeOpen(true);
    }, 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTabClick = useCallback((e: React.MouseEvent) => {
    if (longPressTriggered.current) {
      e.preventDefault();
      longPressTriggered.current = false;
    }
  }, []);

  // ─── Vertical Spine — book-style tab notches (matches mobile) ───

  const verticalSpine = (side: "left" | "right") => {
    const isLeft = side === "left";
    const borderRadius = isLeft
      ? { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderTopRightRadius: 0, borderBottomRightRadius: 0 }
      : { borderTopRightRadius: 8, borderBottomRightRadius: 8, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 };

    return (
      <div
        className={`hidden md:flex flex-col self-stretch shrink-0 z-20 py-1.5 px-0.5 ${dark ? 'pt-[72px]' : ''}`}
        style={{
          width: 56,
          gap: 4,
          order: isLeft ? 0 : 2,
          ...(dark ? { backgroundColor: 'rgba(255,255,255,0.03)' } : {}),
        }}
      >
        {/* Drag handle */}
        {onPositionChange && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center justify-center h-6 cursor-grab active:cursor-grabbing transition-all touch-none select-none rounded-md mx-0.5"
            style={{
              backgroundColor: dark ? 'rgba(255,255,255,0.06)' : theme.base + '25',
            }}
            title="Drag to reposition"
          >
            <GripVertical size={10} style={{ color: dark ? 'rgba(255,255,255,0.3)' : textOnBase + '60' }} />
          </div>
        )}

        {visibleTabs.map(({ segment, label, icon: Icon }) => {
          const active = isActive(segment);
          const href = segment ? `${basePath}/${segment}` : basePath;
          const tabColor = getTabColor(segment);

          return (
            <Link
              key={segment}
              href={href}
              title={label}
              onClick={handleTabClick}
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              className="flex items-center justify-center group relative transition-all duration-200 ease-out rounded-lg mx-0.5"
              style={{
                backgroundColor: active
                  ? tabColor
                  : dark
                    ? tabColor + '55'
                    : tabColor + '18',
                height: 44,
                ...(active ? { boxShadow: `0 0 8px ${tabColor}40` } : {}),
              }}
            >
              <Icon
                size={19}
                style={{
                  color: active
                    ? textOnBase
                    : dark
                      ? 'rgba(255,255,255,0.75)'
                      : tabColor,
                }}
                className="group-hover:opacity-100 transition-opacity"
              />
              {/* Tooltip */}
              <div
                className={`absolute px-2.5 py-1 bg-gray-900 text-white text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30 ${
                  isLeft ? "left-full ml-2" : "right-full mr-2"
                }`}
              >
                {label}
              </div>
            </Link>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Customize button */}
        <button
          onClick={() => setCustomizeOpen((v) => !v)}
          title="Customize tabs"
          className="flex items-center justify-center transition-all duration-200 hover:opacity-80 rounded-lg mx-0.5"
          style={{
            backgroundColor: dark ? 'rgba(255,255,255,0.05)' : theme.base + '15',
            height: 30,
          }}
        >
          <SlidersHorizontal size={11} style={{ color: dark ? 'rgba(255,255,255,0.25)' : theme.base + '80' }} />
        </button>

        {/* Popover anchored to spine */}
        <TabCustomizePopover
          open={customizeOpen}
          onClose={closeCustomize}
          anchorSide={isLeft ? 'left' : 'right'}
        />
      </div>
    );
  };

  // ─── Horizontal Spine — book-style tab notches (matches mobile) ───

  const horizontalSpine = (isMobile: boolean) => (
    <div
      className={`overflow-x-auto scrollbar-hide relative ${
        isMobile
          ? "md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 backdrop-blur-xl"
          : "hidden md:block"
      }`}
      style={{
        order: isMobile ? undefined : -1,
        ...(isMobile
          ? { backgroundColor: dark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)', WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }
          : dark ? { backgroundColor: 'rgba(255,255,255,0.03)' } : {}),
      }}
    >
      <div className="flex items-end gap-[2px] p-[2px]">
        {/* Drag handle — same height as tabs */}
        {!isMobile && onPositionChange && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center justify-center shrink-0 h-[48px] px-1 cursor-grab active:cursor-grabbing touch-none select-none"
            style={{
              backgroundColor: dark ? 'rgba(255,255,255,0.06)' : theme.base + '80',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
            }}
            title="Drag to reposition"
          >
            <GripHorizontal size={12} style={{ color: dark ? 'rgba(255,255,255,0.3)' : textOnBase + '80' }} />
          </div>
        )}

        {visibleTabs.map(({ segment, label, icon: Icon }) => {
          const active = isActive(segment);
          const href = segment ? `${basePath}/${segment}` : basePath;
          const tabColor = getTabColor(segment);

          return (
            <Link
              key={segment}
              href={href}
              onClick={handleTabClick}
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              className="flex-1 flex items-center justify-center gap-1.5 shrink-0 h-[48px] px-4 transition-colors duration-200"
              style={{
                backgroundColor: active
                  ? tabColor
                  : dark
                    ? tabColor + '40'
                    : tabColor + 'B3',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                ...(active ? { boxShadow: `0 0 8px ${tabColor}40` } : {}),
              }}
            >
              <Icon
                size={18}
                style={{
                  color: active
                    ? textOnBase
                    : dark
                      ? 'rgba(255,255,255,0.45)'
                      : textOnBase + '99',
                }}
              />
              <span
                className={`text-[13px] whitespace-nowrap ${
                  active ? "" : "hidden sm:inline"
                }`}
                style={{
                  fontWeight: active ? 600 : 400,
                  color: active
                    ? textOnBase
                    : dark
                      ? 'rgba(255,255,255,0.35)'
                      : textOnBase + '99',
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Popover anchored to horizontal spine */}
      <TabCustomizePopover
        open={customizeOpen}
        onClose={closeCustomize}
        anchorSide="bottom"
      />
    </div>
  );

  return (
    <>
      {/* Desktop: Render based on position */}
      {position === "top"
        ? horizontalSpine(false)
        : verticalSpine(position)
      }

      {/* Mobile: Always horizontal top */}
      {horizontalSpine(true)}
    </>
  );
}
