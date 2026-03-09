"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar, Plane, Building2, UtensilsCrossed, Compass,
  Luggage, PieChart, Info, Heart, Plus, X, Car,
  GripVertical, GripHorizontal,
  Settings2,
  type LucideIcon,
} from "lucide-react";

// ─── Tab Configuration (matches v3 tabsConfig.tsx) ──────────

interface TabDef {
  segment: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
}

const CORE_TABS: TabDef[] = [
  { segment: "itinerary",   label: "Itinerary",    subtitle: "Your day-by-day travel plan",       icon: Calendar,          color: "#1e3a5f" },
  { segment: "hotels",      label: "Hotels",        subtitle: "Accommodation & stays",             icon: Building2,         color: "#1e3a5f" },
  { segment: "flights",     label: "Flights",       subtitle: "Flight bookings & details",         icon: Plane,             color: "#1e3a5f" },
  { segment: "restaurants", label: "Restaurants",    subtitle: "Dining reservations & discoveries", icon: UtensilsCrossed,   color: "#1e3a5f" },
  { segment: "activities",  label: "Explore",       subtitle: "Activities, tours & events",        icon: Compass,           color: "#1e3a5f" },
];

const OPTIONAL_TABS: TabDef[] = [
  { segment: "packing",     label: "Packing",       subtitle: "What to bring",                     icon: Luggage,           color: "#1e3a5f" },
  { segment: "budget",      label: "Budget",        subtitle: "Trip expenses & spending",           icon: PieChart,          color: "#1e3a5f" },
  { segment: "info",        label: "Trip Info",     subtitle: "Essential travel information",       icon: Info,              color: "#1e3a5f" },
  { segment: "settings",    label: "Settings",      subtitle: "Trip preferences & account",         icon: Settings2,         color: "#1e3a5f" },
];

const ALL_TABS = [...CORE_TABS, ...OPTIONAL_TABS];

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

// ─── Exports for content header ─────────────────────────────

export function getTabMeta(segment: string): TabDef | undefined {
  return ALL_TABS.find((t) => t.segment === segment);
}

// ─── Component ──────────────────────────────────────────────

export default function TripTabs({
  tripId,
  position = "left",
  onPositionChange,
}: {
  tripId: string;
  position?: SpinePosition;
  onPositionChange?: (pos: SpinePosition) => void;
}) {
  const pathname = usePathname();
  const basePath = `/trip/${tripId}`;
  const [showOptional, setShowOptional] = useState(false);
  const [spineRevealed, setSpineRevealed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null);

  function isActive(segment: string) {
    if (segment === "") return pathname === basePath;
    return pathname === `${basePath}/${segment}`;
  }

  const revealSpine = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setSpineRevealed(true);
  };

  const startHideSpine = () => {
    hideTimer.current = setTimeout(() => setSpineRevealed(false), 400);
  };

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  const visibleTabs = showOptional ? ALL_TABS : CORE_TABS;

  const { onPointerDown, onPointerMove, onPointerUp } = useDragToReposition(onPositionChange);

  // ─── Vertical Spine (left or right) ───────────────────────

  const verticalSpine = (side: "left" | "right") => (
    <div
      className="hidden md:flex flex-col self-stretch shrink-0 relative z-20 transition-all duration-300 ease-in-out"
      style={{
        width: spineRevealed ? 52 : 6,
        order: side === "right" ? 2 : 0,
      }}
      onMouseEnter={revealSpine}
      onMouseLeave={startHideSpine}
    >
      {/* Collapsed strip */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundColor: "#1e3a5f",
          opacity: spineRevealed ? 0 : 1,
          pointerEvents: spineRevealed ? "none" : "auto",
          borderRadius: side === "left" ? "12px 0 0 12px" : "0 12px 12px 0",
        }}
      />

      {/* Revealed spine */}
      <div
        className="flex flex-col items-center gap-1 py-3 h-full transition-opacity duration-300"
        style={{
          backgroundColor: "#1e3a5f",
          width: 52,
          opacity: spineRevealed ? 1 : 0,
          pointerEvents: spineRevealed ? "auto" : "none",
          borderRadius: side === "left" ? "12px 0 0 12px" : "0 12px 12px 0",
        }}
      >
        {/* Drag handle at top — drag to reposition spine */}
        {onPositionChange && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center justify-center w-10 h-6 rounded-md cursor-grab active:cursor-grabbing text-white/30 hover:text-white/70 hover:bg-white/10 transition-all touch-none select-none mb-1"
            title="Drag to reposition"
          >
            <GripVertical size={14} />
          </div>
        )}

        {visibleTabs.map(({ segment, label, icon: Icon, color }) => {
          const active = isActive(segment);
          const href = segment ? `${basePath}/${segment}` : basePath;

          return (
            <Link
              key={segment}
              href={href}
              title={label}
              className="flex items-center justify-center shrink-0 transition-all duration-200 group relative"
              style={{
                backgroundColor: active ? color : "transparent",
                borderRadius: 8,
                width: active ? 42 : 36,
                height: active ? 38 : 32,
              }}
            >
              <Icon
                size={16}
                className={active ? "text-white" : "text-white/60 group-hover:text-white/90"}
              />
              {/* Tooltip */}
              <div
                className={`absolute px-2.5 py-1 bg-gray-900 text-white text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg ${
                  side === "left" ? "left-full ml-2" : "right-full mr-2"
                }`}
              >
                {label}
              </div>
            </Link>
          );
        })}

        <div className="flex-1" />

        {/* Toggle optional tabs */}
        <button
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all text-white/50 hover:text-white/90 hover:bg-white/10"
        >
          {showOptional ? <X size={13} /> : <Plus size={13} />}
        </button>
      </div>
    </div>
  );

  // ─── Horizontal Spine (top) ───────────────────────────────

  const horizontalSpine = (isMobile: boolean) => (
    <div
      className={`overflow-x-auto scrollbar-hide ${isMobile ? "md:hidden" : "hidden md:block"}`}
      style={{ backgroundColor: "#1e3a5f", order: isMobile ? undefined : -1 }}
    >
      <div className="flex items-center gap-0.5 px-2 py-2">
        {/* Drag handle at start — drag to reposition spine */}
        {!isMobile && onPositionChange && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center justify-center w-7 h-7 rounded-md cursor-grab active:cursor-grabbing text-white/30 hover:text-white/70 hover:bg-white/10 transition-all shrink-0 mr-1 touch-none select-none"
            title="Drag to reposition"
          >
            <GripHorizontal size={14} />
          </div>
        )}

        {visibleTabs.map(({ segment, label, icon: Icon, color }) => {
          const active = isActive(segment);
          const href = segment ? `${basePath}/${segment}` : basePath;

          return (
            <Link
              key={segment}
              href={href}
              className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg transition-all duration-200"
              style={{ backgroundColor: active ? color : "transparent" }}
            >
              <Icon
                size={15}
                className={active ? "text-white" : "text-white/60"}
              />
              <span
                className={`text-[11px] whitespace-nowrap ${
                  active ? "text-white" : "text-white/60 hidden sm:inline"
                }`}
                style={{ fontWeight: active ? 600 : 400 }}
              >
                {label}
              </span>
            </Link>
          );
        })}

        <div className="flex-1" />

        {/* Toggle optional tabs */}
        <button
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
        >
          {showOptional ? <X size={13} /> : <Plus size={13} />}
        </button>
      </div>
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
