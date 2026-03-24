import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Initialize markercluster on the client side
if (typeof window !== "undefined") {
  // @ts-ignore
  window.L = L;
  require("leaflet.markercluster");
}

import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  MapPin,
  Heart,
  X,
  ChevronLeft,
  ChevronRight,
  Compass,
  Stamp,
  NotebookPen,
  Navigation,
  Star,
  Plane,
  Globe,
  Mail,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  Maximize2,
  List,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  NearbyPlace, 
  NEARBY_PLACE_ICONS, 
  NEARBY_PLACES, 
  DESTINATION_COORDS, 
  getCategoryColor 
} from "./GlobeData";

/* ─── useIsMobile hook ─── */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

interface TravelDestination {
  name: string;
  images: string[];
  category: string;
  places: string[];
  highlights: string[];
  duration: string;
}

interface GlobeViewProps {
  destinations: TravelDestination[];
  descriptions: Record<string, string>;
  favoritedNames: Set<string>;
  toggleFavorite: (name: string) => void;
}

/* ─── Sidebar Trip Card (postcard mini) ─── */
function SidebarTripCard({
  dest,
  description,
  isFavorited,
  isActive,
  onClick,
}: {
  dest: TravelDestination;
  description: string;
  isFavorited: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const accentColor = getCategoryColor(dest.category);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`relative cursor-pointer group rounded-xl overflow-hidden transition-all duration-300 ${
        isActive
          ? "ring-2 shadow-lg scale-[1.02]"
          : "shadow-sm hover:shadow-md hover:scale-[1.01]"
      }`}
      style={{
        borderColor: isActive ? accentColor : "rgba(0,0,0,0.06)",
        border: isActive ? `2px solid ${accentColor}` : "1px solid rgba(0,0,0,0.06)",
        background: "white",
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Postcard white border effect */}
      <div className="p-1.5">
        {/* Image */}
        <div className="relative w-full h-28 rounded-lg overflow-hidden">
          {!imgLoaded && (
            <div className="absolute inset-0 bg-gray-100 animate-pulse" />
          )}
          <img
            src={dest.images[0]}
            alt={dest.name}
            className="w-full h-full object-cover"
            onLoad={() => setImgLoaded(true)}
            draggable={false}
          />

          {/* Category badge */}
          <span
            className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-white backdrop-blur-sm"
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.3px",
              backgroundColor: `${accentColor}cc`,
            }}
          >
            {dest.category}
          </span>

          {/* Favorite heart */}
          {isFavorited && (
            <div className="absolute top-2 right-2 z-10">
              <Heart size={12} className="text-red-500 fill-red-500 drop-shadow-sm" />
            </div>
          )}

          {/* Stamp decorative */}
          <div className="absolute bottom-1 right-1 opacity-15 pointer-events-none">
            <Stamp size={24} className="text-white" style={{ transform: "rotate(-12deg)" }} />
          </div>

          {/* Subtle gradient overlay */}
          <div
            className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)",
            }}
          />
        </div>

        {/* Text content */}
        <div className="px-2 py-2">
          <h4
            className="text-[#314158] truncate"
            style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "-0.3px" }}
          >
            {dest.name}
          </h4>

          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={9} className="text-[#b0b8c1] shrink-0" />
            <span className="text-[#9ca3af] truncate" style={{ fontSize: "10px" }}>
              {dest.places.slice(0, 2).join(" · ")}
            </span>
          </div>

          {description && (
            <p
              className="text-[#9ca3af] line-clamp-2 mt-1.5"
              style={{
                fontSize: "10px",
                lineHeight: "1.4",
                fontStyle: "italic",
              }}
            >
              "{description}"
            </p>
          )}
        </div>
      </div>

      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
          style={{ backgroundColor: accentColor }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      {/* Decorative postcard corner */}
      <div
        className="absolute top-0 right-0 w-6 h-6 pointer-events-none opacity-[0.03]"
        style={{
          background: `linear-gradient(135deg, transparent 50%, ${accentColor} 50%)`,
        }}
      />
    </motion.div>
  );
}

/* ─── Airmail Stripe Border SVG ─── */
function AirmailBorder() {
  const patternId = `airmail-stripes-${useId().replace(/:/g, "")}`;
  return (
    <svg width="100%" height="100%" className="absolute inset-0 z-0 rounded-lg" preserveAspectRatio="none">
      <defs>
        <pattern id={patternId} patternUnits="userSpaceOnUse" width="20" height="20" patternTransform="rotate(45)">
          <rect width="7" height="20" fill="#d43d3d" opacity="0.55" />
          <rect x="7" width="6" height="20" fill="#f5f0e8" />
          <rect x="13" width="7" height="20" fill="#3b6eb5" opacity="0.45" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} rx="8" />
    </svg>
  );
}

/* ─── Postcard Popup (flip card modal) ─── */
function PostcardPopup({
  dest,
  description,
  isFavorited,
  onClose,
  onToggleFavorite,
}: {
  dest: TravelDestination;
  description: string;
  isFavorited: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);
  const [entering, setEntering] = useState(true);
  const [backTab, setBackTab] = useState<"notes" | "highlights" | "nearby">("notes");
  const accentColor = getCategoryColor(dest.category);
  const isMobile = useIsMobile();
  const nearbyForBack = NEARBY_PLACES[dest.name] || [];
  const hasHighlights = !!(dest.highlights && dest.highlights.length > 0);
  const hasNearby = nearbyForBack.length > 0;

  useEffect(() => {
    requestAnimationFrame(() => setEntering(false));
  }, []);

  // Lock body scroll while postcard modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Auto-advance images
  useEffect(() => {
    if (dest.images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImg((prev) => (prev + 1) % dest.images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [dest.images.length]);

  // Postmark date
  const postmarkDate = (() => {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const hash = dest.name.length * 7 + dest.category.length * 13;
    return { month: months[hash % 12], day: (hash % 28) + 1, year: 2024 + (hash % 3) };
  })();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", overscrollBehavior: "contain" }}
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className="relative"
        style={{
          perspective: "1400px",
          opacity: entering ? 0 : 1,
          transform: entering ? "scale(0.85) translateY(30px)" : "scale(1) translateY(0)",
          transition: "opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-50 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <X size={14} className="text-[#314158]" />
        </button>

        {/* Flip container — portrait on mobile, landscape on desktop */}
        <div
          style={{
            width: isMobile ? "min(340px, 92vw)" : "min(640px, 92vw)",
            height: isMobile ? "min(520px, 85vh)" : "min(400px, 68vh)",
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 0.8s cubic-bezier(0.4, 0.2, 0.2, 1)",
          }}
        >
          {/* Front side */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden cursor-pointer"
            onClick={() => setIsFlipped(true)}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              pointerEvents: isFlipped ? "none" : "auto",
            }}
          >
            <div className="relative w-full h-full bg-white rounded-lg overflow-hidden shadow-[0_25px_60px_-12px_rgba(0,0,0,0.4)]">
              <AirmailBorder />
              <div
                className="absolute z-[1] rounded overflow-hidden"
                style={{ top: "10px", left: "10px", right: "10px", bottom: "10px" }}
              >
                <div className="relative w-full h-full">
                  {dest.images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={dest.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        opacity: i === currentImg ? 1 : 0,
                        transition: "opacity 0.6s ease-in-out",
                      }}
                      draggable={false}
                    />
                  ))}
                  <div
                    className="absolute inset-x-0 bottom-0 h-32 z-[2] pointer-events-none"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
                    }}
                  />
                  <div className="absolute bottom-4 left-5 right-5 z-[3]">
                    <h2
                      className="text-white"
                      style={{
                        fontSize: "clamp(20px, 4vw, 30px)",
                        fontWeight: 800,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                      }}
                    >
                      {dest.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin size={12} className="text-white/70" />
                      <span
                        className="text-white/80"
                        style={{ fontSize: "12px", letterSpacing: "0.5px" }}
                      >
                        {dest.places.slice(0, 3).join(" · ")}
                      </span>
                    </div>
                  </div>
                  {dest.images.length > 1 && (
                    <div className="absolute bottom-4 right-5 z-[3] flex gap-1.5">
                      {dest.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); setCurrentImg(i); }}
                          className="rounded-full transition-all"
                          style={{
                            width: i === currentImg ? 14 : 5,
                            height: 5,
                            backgroundColor: i === currentImg ? "white" : "rgba(255,255,255,0.4)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <div className="absolute top-4 left-5 z-[3] flex items-center gap-1.5 opacity-50">
                    <Navigation size={9} className="text-white" style={{ transform: "rotate(90deg)" }} />
                    <span className="text-white" style={{ fontSize: "9px", fontWeight: 500 }}>
                      Tap to flip
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite();
                    }}
                    className="absolute top-4 right-5 z-[3]"
                  >
                    <Heart
                      size={18}
                      className={`drop-shadow-md transition-colors ${
                        isFavorited ? "text-red-500 fill-red-500" : "text-white/70 hover:text-red-400"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Back side */}
          <div
            className="absolute inset-0 rounded-lg overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              pointerEvents: isFlipped ? "auto" : "none",
            }}
          >
            <div className="relative w-full h-full rounded-lg overflow-hidden shadow-[0_25px_60px_-12px_rgba(0,0,0,0.4)]">
              <AirmailBorder />
              <div
                className={`absolute z-[1] rounded overflow-hidden ${isMobile ? "flex flex-col" : "flex"}`}
                style={{
                  top: "10px",
                  left: "10px",
                  right: "10px",
                  bottom: "10px",
                  backgroundColor: "#f5f0e6",
                  transformStyle: "flat",
                }}
              >
                <div
                  className="flex-1 min-w-0 relative"
                  style={{
                    borderRight: isMobile ? "none" : "1px dashed rgba(0,0,0,0.1)",
                    borderBottom: isMobile ? "1px dashed rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 flex-wrap"
                    style={{ position: "absolute", top: "12px", left: "16px", right: "16px", zIndex: 5 }}
                  >
                    {([
                      { key: "notes" as const, label: "Notes", icon: <NotebookPen size={9} /> },
                      ...(hasHighlights ? [{ key: "highlights" as const, label: "Highlights", icon: <Star size={9} /> }] : []),
                      ...(hasNearby ? [{ key: "nearby" as const, label: `Nearby (${nearbyForBack.length})`, icon: <MapPin size={9} /> }] : []),
                    ]).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setBackTab(tab.key)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all"
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.8px",
                          textTransform: "uppercase",
                          backgroundColor: backTab === tab.key ? accentColor : "rgba(0,0,0,0.04)",
                          color: backTab === tab.key ? "white" : "#8b7e6a",
                          border: backTab === tab.key ? "none" : "1px solid rgba(0,0,0,0.06)",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ color: backTab === tab.key ? "white" : accentColor, display: "flex" }}>{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div
                    className="absolute overflow-hidden"
                    style={{ top: "42px", left: "16px", right: "16px", bottom: "28px" }}
                  >
                    <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.08 }}>
                      {[...Array(14)].map((_, i) => (
                        <div key={i} className="border-b border-[#4a3f30]" style={{ height: "26px" }} />
                      ))}
                    </div>

                    {backTab === "notes" && (
                      <div className="relative z-[1] h-full">
                        <p
                          style={{
                            fontFamily: "'Patrick Hand', cursive",
                            fontSize: isMobile ? "15px" : "17px",
                            lineHeight: "26px",
                            color: "#3d3529",
                            display: "-webkit-box",
                            WebkitLineClamp: isMobile ? 7 : 11,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          } as React.CSSProperties}
                        >
                          {description || `Greetings from ${dest.name}! Having an absolutely wonderful time exploring this beautiful destination. The views are breathtaking and the food is incredible. The locals are so warm and welcoming — truly an unforgettable experience.`}
                        </p>
                      </div>
                    )}

                    {backTab === "highlights" && hasHighlights && (
                      <div className="relative z-[1] h-full space-y-2">
                        {dest.highlights!.slice(0, isMobile ? 6 : 10).map((h) => (
                          <div key={h} className="flex items-center gap-2">
                            <Star size={11} style={{ color: accentColor }} className="shrink-0 fill-current" />
                            <span style={{ fontFamily: "'Patrick Hand', cursive", fontSize: isMobile ? "14px" : "16px", color: "#3d3529", lineHeight: "26px" }}>
                              {h}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {backTab === "nearby" && hasNearby && (
                      <div className="relative z-[1] h-full space-y-2.5">
                        {nearbyForBack.slice(0, isMobile ? 4 : 6).map((place) => {
                          const pIcon = NEARBY_PLACE_ICONS[place.type];
                          return (
                            <div key={place.name} className="flex items-start gap-2.5">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                style={{ backgroundColor: `${pIcon.color}18` }}
                              >
                                <span style={{ fontSize: "12px", lineHeight: 1 }}>{pIcon.emoji}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <span
                                  style={{
                                    fontFamily: "'Patrick Hand', cursive",
                                    fontSize: isMobile ? "14px" : "16px",
                                    color: "#3d3529",
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {place.name}
                                </span>
                                <p
                                  style={{
                                    fontFamily: "'Patrick Hand', cursive",
                                    fontSize: isMobile ? "11px" : "13px",
                                    color: "#8b7e6a",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {place.note}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-1.5 opacity-40"
                    style={{ position: "absolute", bottom: "8px", left: "16px", zIndex: 5 }}
                    onClick={() => setIsFlipped(false)}
                  >
                    <Navigation size={9} className="text-[#8b7e6a]" style={{ transform: "rotate(-90deg)" }} />
                    <span style={{ fontSize: "9px", fontWeight: 500, color: "#8b7e6a", cursor: "pointer" }}>Tap to flip back</span>
                  </div>
                </div>

                <div
                  className={`${isMobile ? "w-full" : "w-[42%]"} p-5 flex flex-col relative cursor-pointer`}
                  onClick={() => setIsFlipped(false)}
                >
                  <div className="absolute top-4 right-4">
                    <div
                      className="relative overflow-hidden flex flex-col items-center justify-center"
                      style={{
                        width: isMobile ? "48px" : "64px",
                        height: isMobile ? "58px" : "78px",
                        border: "2px dashed #c4b89c",
                        background: "linear-gradient(135deg, #faf7f0 0%, #f0ead8 100%)",
                        borderRadius: "2px",
                      }}
                    >
                      <div className={`${isMobile ? "w-8 h-8" : "w-12 h-12"} rounded-sm overflow-hidden shadow-sm`}>
                        <img
                          src={dest.images[0]}
                          alt=""
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "6px",
                          fontWeight: 700,
                          color: "#8b7e6a",
                          letterSpacing: "0.3px",
                          textTransform: "uppercase",
                          marginTop: "3px",
                        }}
                      >
                        {dest.category}
                      </span>
                    </div>

                    <div
                      className="absolute -left-5 -top-1 pointer-events-none"
                      style={{ transform: "rotate(-15deg)", opacity: 0.25 }}
                    >
                      <div
                        className="w-16 h-16 rounded-full flex flex-col items-center justify-center"
                        style={{ border: "2px solid #64503c" }}
                      >
                        <span style={{ fontSize: "5px", fontWeight: 700, color: "#64503c", letterSpacing: "0.5px" }}>
                          {dest.name.split(",")[0]?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: "8px", fontWeight: 800, color: "#64503c" }}>
                          {postmarkDate.month} {postmarkDate.day}
                        </span>
                        <span style={{ fontSize: "5px", fontWeight: 600, color: "#64503c" }}>
                          {postmarkDate.year}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.10)", paddingBottom: "5px", marginBottom: "6px" }}>
                      <span style={{ fontFamily: "'Patrick Hand', cursive", fontSize: "20px", fontWeight: 700, color: "#3d3529" }}>
                        {dest.name}
                      </span>
                    </div>
                    {dest.places.slice(0, 3).map((place) => (
                      <div
                        key={place}
                        className="flex items-center gap-1.5"
                        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "4px", marginBottom: "4px" }}
                      >
                        <MapPin size={8} style={{ color: accentColor }} className="shrink-0" />
                        <span style={{ fontFamily: "'Patrick Hand', cursive", fontSize: "15px", color: "#5a4f3e" }}>
                          {place}
                        </span>
                      </div>
                    ))}
                    {dest.duration && (
                      <div className="mt-3 flex items-center gap-1.5">
                        <Plane size={9} className="text-[#b0a694]" style={{ transform: "rotate(-45deg)" }} />
                        <span style={{ fontFamily: "'Patrick Hand', cursive", fontSize: "14px", color: "#8b7e6a" }}>
                          {dest.duration} trip
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Category Legend ─── */
function CategoryLegend({ destinations }: { destinations: TravelDestination[] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Get unique categories that are actually used
  const usedCategories = Array.from(
    new Set(destinations.map((d) => d.category))
  ).sort();

  // Count destinations per category
  const categoryCounts = usedCategories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = destinations.filter((d) => d.category === cat).length;
    return acc;
  }, {});

  return (
    <motion.div
      layout
        className="rounded-xl overflow-hidden bg-[#0d1b2a]/90 backdrop-blur-md border border-white/10 shadow-lg"
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Toggle header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/5 transition-colors"
        >
          <Layers size={12} className="text-[#60a5fa]" />
          <span
            className="text-white/80"
            style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px" }}
          >
            LEGEND
          </span>
          <div className="ml-auto">
            {isOpen ? (
              <ChevronUp size={10} className="text-white/40" />
            ) : (
              <ChevronDown size={10} className="text-white/40" />
            )}
          </div>
        </button>

        {/* Legend items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2.5 pt-0.5 space-y-1.5 border-t border-white/5">
                {usedCategories.map((cat) => (
                  <div key={cat} className="flex items-center gap-2.5">
                    <div
                      className="shrink-0 rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: getCategoryColor(cat),
                        border: "1.5px solid rgba(255,255,255,0.5)",
                        boxShadow: `0 0 6px ${getCategoryColor(cat)}66`,
                      }}
                    />
                    <span
                      className="text-white/70 flex-1"
                      style={{ fontSize: "10px", fontWeight: 500 }}
                    >
                      {cat}
                    </span>
                    <span
                      className="text-white/30"
                      style={{ fontSize: "9px", fontWeight: 600 }}
                    >
                      {categoryCounts[cat]}
                    </span>
                  </div>
                ))}
                <div className="border-t border-white/5 pt-1.5 mt-1.5 flex items-center justify-between">
                  <span
                    className="text-white/40"
                    style={{ fontSize: "9px", fontWeight: 500 }}
                  >
                    Total
                  </span>
                  <span
                    className="text-white/50"
                    style={{ fontSize: "9px", fontWeight: 700 }}
                  >
                    {destinations.length}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main GlobeView component ─── */
export function GlobeView({ destinations, descriptions, favoritedNames, toggleFavorite }: GlobeViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDest, setSelectedDest] = useState<TravelDestination | null>(null);
  const [activeSidebarDest, setActiveSidebarDest] = useState<string | null>(null);
  const [previewDest, setPreviewDest] = useState<TravelDestination | null>(null);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const markerClickedRef = useRef(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const isMobile = useIsMobile();
  const [mobileStripIndex, setMobileStripIndex] = useState(0);
  const stripScrollRef = useRef<HTMLDivElement>(null);
  const stripCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nearbyLayerRef = useRef<L.LayerGroup | null>(null);
  const nearbyMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const [mapZoom, setMapZoom] = useState(3);
  const [nearbyFocusDest, setNearbyFocusDest] = useState<TravelDestination | null>(null);
  const [nearbyLegendOpen, setNearbyLegendOpen] = useState(false);

  // On mobile, default sidebar to closed
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Filtered destinations for sidebar
  const filteredDests = sidebarSearch.trim()
    ? destinations.filter((d) => {
        const q = sidebarSearch.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.places.some((p) => p.toLowerCase().includes(q))
        );
      })
    : destinations;

  const updatePreviewPosition = useCallback((dest: TravelDestination) => {
    const map = mapRef.current;
    if (!map) return;
    const coords = DESTINATION_COORDS[dest.name];
    if (!coords) return;
    const point = map.latLngToContainerPoint(coords);
    setPreviewPos({ x: point.x, y: point.y });
  }, []);

  const handleMarkerClick = useCallback(
    (dest: TravelDestination) => {
      markerClickedRef.current = true;
      setTimeout(() => { markerClickedRef.current = false; }, 100);

      setActiveSidebarDest(dest.name);
      setNearbyFocusDest(null);
      setPreviewDest((prev) => {
        if (prev?.name === dest.name) {
          setSelectedDest(dest);
          return null;
        }
        updatePreviewPosition(dest);
        return dest;
      });
      setSelectedDest(null);

      const coords = DESTINATION_COORDS[dest.name];
      if (coords && mapRef.current) {
        const nearby = NEARBY_PLACES[dest.name] || [];
        if (nearby.length > 0) {
          const allCoords = [coords, ...nearby.map((p) => p.coords as [number, number])];
          const bounds = L.latLngBounds(allCoords.map(([lat, lng]) => L.latLng(lat, lng)));
          mapRef.current.flyToBounds(bounds, {
            padding: [80, 80],
            duration: 1.2,
            maxZoom: 15,
          });
        } else {
          mapRef.current.flyTo(coords, Math.max(mapRef.current.getZoom(), 13), {
            duration: 1.2,
            easeLinearity: 0.25,
          });
        }
      }

      const cardEl = cardRefs.current[dest.name];
      if (cardEl && sidebarScrollRef.current) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [updatePreviewPosition]
  );

  const handleSidebarCardClick = useCallback(
    (dest: TravelDestination) => {
      const coords = DESTINATION_COORDS[dest.name];
      if (!coords || !mapRef.current) return;

      setActiveSidebarDest(dest.name);
      setSelectedDest(null);

      const map = mapRef.current;
      const nearby = NEARBY_PLACES[dest.name] || [];
      if (nearby.length > 0) {
        const allCoords = [coords, ...nearby.map((p) => p.coords as [number, number])];
        const bounds = L.latLngBounds(allCoords.map(([lat, lng]) => L.latLng(lat, lng)));
        map.flyToBounds(bounds, {
          padding: [80, 80],
          duration: 1.2,
          maxZoom: 15,
        });
      } else {
        map.flyTo(coords, Math.max(map.getZoom(), 13), {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }

      const onFlyEnd = () => {
        map.off("moveend", onFlyEnd);
        setNearbyFocusDest(null);
        setPreviewDest(dest);
        updatePreviewPosition(dest);
      };
      map.on("moveend", onFlyEnd);
    },
    [updatePreviewPosition]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onMove = () => {
      if (previewDest) {
        updatePreviewPosition(previewDest);
      }
    };
    map.on("move", onMove);
    map.on("zoom", onMove);
    return () => {
      map.off("move", onMove);
      map.off("zoom", onMove);
    };
  }, [previewDest, updatePreviewPosition]);

  const nearbyActiveDest = nearbyFocusDest || previewDest;
  const nearbyPlacesForPreview = nearbyActiveDest ? (NEARBY_PLACES[nearbyActiveDest.name] || []) : [];

  useEffect(() => { setNearbyLegendOpen(false); }, [nearbyActiveDest?.name]);

  const NEARBY_MIN_ZOOM = 8;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (nearbyLayerRef.current) {
      map.removeLayer(nearbyLayerRef.current);
      nearbyLayerRef.current = null;
    }
    nearbyMarkersRef.current.clear();

    const focusDest = nearbyFocusDest || previewDest;
    if (!focusDest) return;
    if (mapZoom < NEARBY_MIN_ZOOM) return;

    const nearbyPlaces = NEARBY_PLACES[focusDest.name];
    if (!nearbyPlaces || nearbyPlaces.length === 0) return;

    const destCoords = DESTINATION_COORDS[focusDest.name];
    if (!destCoords) return;

    const layerGroup = L.layerGroup();

    nearbyPlaces.forEach((place, i) => {
      const iconInfo = NEARBY_PLACE_ICONS[place.type];
      const size = isMobile ? 32 : 28;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width: ${size}px; height: ${size}px; border-radius: 50%;
          background: ${iconInfo.color};
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: ${size * 0.45}px;
          line-height: 1;
          animation: nearbyPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          animation-delay: ${i * 60}ms;
        ">${iconInfo.emoji}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(place.coords, { icon });
      marker.bindPopup(
        `<div style="font-family: 'Patrick Hand', cursive; min-width: 180px; max-width: 220px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 16px;">${iconInfo.emoji}</span>
            <span style="font-size: 14px; font-weight: 700; color: #1e293b;">${place.name}</span>
          </div>
          <div style="font-size: 12px; color: #64748b; text-transform: capitalize; margin-bottom: 6px;">${place.type}</div>
          <div style="font-size: 13px; color: #334155; line-height: 1.4; border-top: 1px dashed #e2e8f0; padding-top: 6px;">${place.note}</div>
        </div>`,
        { className: "nearby-place-popup", closeButton: true, maxWidth: 240 }
      );

      marker.on("click", () => {
        setPreviewDest(null);
        setNearbyFocusDest(focusDest);
      });

      layerGroup.addLayer(marker);
      nearbyMarkersRef.current.set(place.name, marker);

      const polylineOutline = L.polyline([destCoords, place.coords], {
        color: "rgba(255,255,255,0.6)",
        weight: 5,
        opacity: 1,
        dashArray: "8, 10",
        lineCap: "round",
        className: "nearby-dash-line",
      });
      layerGroup.addLayer(polylineOutline);

      const polyline = L.polyline([destCoords, place.coords], {
        color: iconInfo.color,
        weight: 3,
        opacity: 0.85,
        dashArray: "8, 10",
        lineCap: "round",
        className: "nearby-dash-line",
      });
      layerGroup.addLayer(polyline);
    });

    layerGroup.addTo(map);
    nearbyLayerRef.current = layerGroup;

    return () => {
      if (nearbyLayerRef.current) {
        map.removeLayer(nearbyLayerRef.current);
        nearbyLayerRef.current = null;
      }
    };
  }, [previewDest, nearbyFocusDest, isMobile, mapZoom]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30, 10],
      zoom: 3,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
      maxBounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
      maxBoundsViscosity: 1.0,
    });

    const natGeoLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a> — National Geographic',
      maxZoom: 16,
    });

    const streetLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a> — World Street Map',
      maxZoom: 18,
    });

    const TILE_SWITCH_ZOOM = 7;
    const CROSSFADE_MS = 600;
    const CROSSFADE_STEPS = 20;
    let activeLayer: "natgeo" | "street" = "natgeo";
    let crossfading = false;

    natGeoLayer.setOpacity(1);
    streetLayer.setOpacity(0);
    natGeoLayer.addTo(map);
    streetLayer.addTo(map);
    streetLayer.bringToBack();

    function crossfade(fadeIn: L.TileLayer, fadeOut: L.TileLayer) {
      if (crossfading) return;
      crossfading = true;
      fadeIn.bringToFront();
      const stepTime = CROSSFADE_MS / CROSSFADE_STEPS;
      let step = 0;
      const iv = setInterval(() => {
        step++;
        const t = step / CROSSFADE_STEPS;
        fadeIn.setOpacity(t);
        fadeOut.setOpacity(1 - t);
        if (step >= CROSSFADE_STEPS) {
          clearInterval(iv);
          fadeIn.setOpacity(1);
          fadeOut.setOpacity(0);
          fadeOut.bringToBack();
          crossfading = false;
        }
      }, stepTime);
    }

    map.on("zoomend", () => {
      const z = map.getZoom();
      setMapZoom(z);
      if (z < NEARBY_MIN_ZOOM) {
        setNearbyFocusDest(null);
        setPreviewDest(null);
      }
      if (z >= TILE_SWITCH_ZOOM && activeLayer === "natgeo") {
        activeLayer = "street";
        crossfade(streetLayer, natGeoLayer);
      } else if (z < TILE_SWITCH_ZOOM && activeLayer === "street") {
        activeLayer = "natgeo";
        crossfade(natGeoLayer, streetLayer);
      }
    });

    mapRef.current = map;

    map.on("click", () => {
      if (!markerClickedRef.current) {
        setPreviewDest((prev) => {
          if (prev) {
            setNearbyFocusDest(prev);
          }
          return null;
        });
      }
    });

    const markerCategoryMap = new Map<L.Marker, string>();

    destinations.forEach((dest) => {
      const coords = DESTINATION_COORDS[dest.name];
      if (!coords) return;
      const color = getCategoryColor(dest.category);
      const pinSize = isMobile ? 24 : 16;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width: ${pinSize}px; height: ${pinSize}px; border-radius: 50%;
          background: ${color}; border: 2.5px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s ease;
        "></div>`,
        iconSize: [pinSize, pinSize],
        iconAnchor: [pinSize / 2, pinSize / 2],
      });
      const marker = L.marker(coords, { icon });
      marker.on("click", () => handleMarkerClick(dest));
      markersRef.current.push(marker);
      markerCategoryMap.set(marker, color);
    });

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      removeOutsideVisibleBounds: true,
      animateAddingMarkers: true,
      disableClusteringAtZoom: 8,
      iconCreateFunction: (cluster) => {
        const childMarkers = cluster.getAllChildMarkers();
        const count = childMarkers.length;
        const size = count < 5 ? 36 : count < 10 ? 42 : 48;
        const colorCounts: Record<string, number> = {};
        childMarkers.forEach((m) => {
          const col = markerCategoryMap.get(m) || "#64748b";
          colorCounts[col] = (colorCounts[col] || 0) + 1;
        });
        const catEntries = Object.entries(colorCounts);
        let gradientParts: string[] = [];
        let accum = 0;
        catEntries.forEach(([color, c]) => {
          const pct = (c / count) * 100;
          gradientParts.push(`${color} ${accum}% ${accum + pct}%`);
          accum += pct;
        });
        const gradient = gradientParts.length > 0
          ? `conic-gradient(${gradientParts.join(", ")})`
          : "linear-gradient(135deg, #60a5fa, #3b82f6)";

        return L.divIcon({
          className: "",
          html: `<div style="
            width: ${size}px; height: ${size}px; border-radius: 50%;
            background: ${gradient};
            border: 3px solid white;
            box-shadow: 0 3px 12px rgba(0,0,0,0.35), 0 0 0 2px rgba(96,165,250,0.15);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            <div style="
              width: ${size - 10}px; height: ${size - 10}px; border-radius: 50%;
              background: rgba(13, 27, 42, 0.92);
              display: flex; align-items: center; justify-content: center;
              backdrop-filter: blur(4px);
            ">
              <span style="
                color: white; font-size: ${count < 10 ? 13 : 12}px;
                font-weight: 800; letter-spacing: -0.3px;
                text-shadow: 0 1px 3px rgba(0,0,0,0.3);
              ">${count}</span>
            </div>
          </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });
    clusterGroup.addLayers(markersRef.current);
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    L.control.zoom({ position: "bottomright" }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      clusterGroupRef.current?.remove();
    };
  }, [destinations, handleMarkerClick, isMobile]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      if (mapRef.current && (mapRef.current as any)._container) {
        mapRef.current.invalidateSize();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  const sidebarContent = (
    <>
      <div className={`${isMobile ? "px-4 pt-3 pb-2" : "p-4"} border-b border-white/5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[#60a5fa]" />
            <h3 className="text-white" style={{ fontSize: "14px", fontWeight: 700 }}>
              Previous Trips
            </h3>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            {isMobile ? (
              <ChevronDown size={14} className="text-white/60" />
            ) : (
              <ChevronLeft size={12} className="text-white/60" />
            )}
          </button>
        </div>
        <p className="text-white/40 mt-1" style={{ fontSize: "10px" }}>
          {destinations.length} destinations explored
        </p>
      </div>

      <div className="px-3 py-2.5 border-b border-white/5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-[#8b7e6a]" />
          <input
            type="text"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Search destinations..."
            className="w-full h-9 px-3 py-1.5 pl-10 rounded-full bg-[#0d1b2a]/80 backdrop-blur-md border border-white/10 focus:outline-none focus:border-[#60a5fa] transition-colors"
            style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)" }}
          />
          {sidebarSearch && (
            <button
              onClick={() => setSidebarSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={10} className="text-white/60" />
            </button>
          )}
        </div>
      </div>

      <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredDests.length > 0 ? (
          filteredDests.map((dest) => (
            <div key={dest.name} ref={(el) => { cardRefs.current[dest.name] = el; }}>
              <SidebarTripCard
                dest={dest}
                description={descriptions[dest.name] || ""}
                isFavorited={favoritedNames.has(dest.name)}
                isActive={activeSidebarDest === dest.name}
                onClick={() => handleSidebarCardClick(dest)}
              />
            </div>
          ))
        ) : sidebarSearch.trim() ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2.5">
              <Search size={16} className="text-white/20" />
            </div>
            <p className="text-white/50 mb-0.5" style={{ fontSize: "12px", fontWeight: 600 }}>
              No destinations found
            </p>
            <p className="text-white/30 max-w-[200px]" style={{ fontSize: "10px" }}>
              No results for &ldquo;{sidebarSearch.trim()}&rdquo;
            </p>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div className={`relative w-full ${isMobile ? "h-[calc(100vh-140px)] min-h-[400px]" : "h-[calc(100vh-200px)] min-h-[500px]"} rounded-2xl overflow-hidden bg-[#0a1628]`}>
      <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full" />

      {!isMobile && (
        <div className={`absolute top-0 left-0 h-full z-[1000] transition-all duration-300 ${sidebarOpen ? "w-[280px]" : "w-0"}`}>
          {sidebarOpen && (
            <div className="w-[280px] h-full bg-[#0d1b2a]/95 backdrop-blur-md border-r border-white/5 flex flex-col">
              {sidebarContent}
            </div>
          )}
        </div>
      )}

      {isMobile && (
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="absolute bottom-0 left-0 right-0 z-[1000] bg-[#0d1b2a]/95 backdrop-blur-md border-t border-white/10 rounded-t-2xl flex flex-col"
              style={{ height: "55vh", maxHeight: "420px" }}
            >
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              {sidebarContent}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {!sidebarOpen && !isMobile && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-4 z-[1000] w-9 h-9 rounded-lg bg-[#0d1b2a]/90 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-[#0d1b2a] transition-colors"
        >
          <ChevronRight size={14} className="text-white/70" />
        </button>
      )}

      <div className={`absolute ${isMobile ? "top-3 right-3" : "top-4 right-4"} z-[1000] flex flex-col items-end gap-2`}>
        {!isMobile && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d1b2a]/80 backdrop-blur-md border border-white/10">
            <Compass size={12} className="text-[#60a5fa]" />
            <span className="text-white/70" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px" }}>
              EXPLORE
            </span>
          </div>
        )}
        <CategoryLegend destinations={destinations} />
      </div>

      <AnimatePresence>
        {nearbyActiveDest && nearbyPlacesForPreview.length > 0 && mapZoom >= NEARBY_MIN_ZOOM && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`absolute z-[1000] ${isMobile ? "top-3 left-3 max-w-[200px]" : `bottom-14 max-w-[240px] transition-all duration-300 ${sidebarOpen ? "left-[296px]" : "left-4"}`}`}
          >
            {!isMobile && nearbyFocusDest && !previewDest && (
              <button
                className="mb-2 w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-2 rounded-xl shadow-lg active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #faf7f0 0%, #f0ead8 100%)",
                  border: "2.5px solid #d43d3d",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(212,61,61,0.15)",
                }}
                onClick={() => {
                  const dest = nearbyFocusDest;
                  setPreviewDest(dest);
                  setNearbyFocusDest(null);
                  updatePreviewPosition(dest);
                }}
              >
                <Mail size={13} className="text-[#d43d3d]" />
                <span style={{ fontFamily: "'Patrick Hand', cursive", fontSize: "12px", fontWeight: 700, color: "#5c4033", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
                  Show Postcard
                </span>
              </button>
            )}
            <div className="bg-[#0d1b2a]/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl">
              <div
                className={`flex items-center gap-2 px-3 py-2 ${(!isMobile || nearbyLegendOpen) ? "border-b border-white/5" : ""} ${isMobile ? "cursor-pointer active:bg-white/5" : ""}`}
                onClick={isMobile ? () => setNearbyLegendOpen((o) => !o) : undefined}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: getCategoryColor(nearbyActiveDest.category) }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "white" }}>{nearbyPlacesForPreview.length}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white truncate" style={{ fontSize: "11px", fontWeight: 700 }}>Nearby Places</p>
                  <p className="text-white/40 truncate" style={{ fontSize: "9px" }}>{nearbyActiveDest.name}</p>
                </div>
                {isMobile ? (
                  <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                    {nearbyLegendOpen ? <ChevronUp size={11} className="text-white/60" /> : <ChevronDown size={11} className="text-white/60" />}
                  </div>
                ) : (
                  <button
                    title="Fit all"
                    onClick={() => {
                      const map = mapRef.current;
                      if (!map || !nearbyActiveDest) return;
                      const destCoords = DESTINATION_COORDS[nearbyActiveDest.name];
                      const allCoords: [number, number][] = nearbyPlacesForPreview.map((p) => p.coords);
                      if (destCoords) allCoords.push(destCoords);
                      if (allCoords.length === 0) return;
                      map.flyToBounds(L.latLngBounds(allCoords), { padding: [60, 60], duration: 1, maxZoom: 14 });
                    }}
                    className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Maximize2 size={11} className="text-[#60a5fa]" />
                  </button>
                )}
              </div>
              {(!isMobile || nearbyLegendOpen) && (
                <>
                  <div className={`px-2 py-1.5 space-y-0.5 ${isMobile ? "max-h-[140px]" : "max-h-[180px]"} overflow-y-auto`}>
                    {nearbyPlacesForPreview.map((place) => {
                      const iconInfo = NEARBY_PLACE_ICONS[place.type];
                      return (
                        <button
                          key={place.name}
                          className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer text-left"
                          onClick={() => {
                            const map = mapRef.current;
                            if (!map) return;
                            map.flyTo(place.coords, Math.max(map.getZoom(), 13), { duration: 0.8 });
                            setTimeout(() => {
                              const marker = nearbyMarkersRef.current.get(place.name);
                              if (marker) marker.openPopup();
                            }, 900);
                            if (isMobile) setNearbyLegendOpen(false);
                          }}
                        >
                          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: iconInfo.color }}>
                            <span style={{ fontSize: "8px", lineHeight: 1 }}>{iconInfo.emoji}</span>
                          </div>
                          <span className="text-white/80 truncate" style={{ fontSize: "10px" }}>{place.name}</span>
                          <Navigation size={8} className="ml-auto text-white/20 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                  {isMobile && (
                    <button
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border-t border-white/5 hover:bg-white/5 transition-colors"
                      onClick={() => {
                        const map = mapRef.current;
                        if (!map || !nearbyActiveDest) return;
                        const destCoords = DESTINATION_COORDS[nearbyActiveDest.name];
                        const allCoords: [number, number][] = nearbyPlacesForPreview.map((p) => p.coords);
                        if (destCoords) allCoords.push(destCoords);
                        map.flyToBounds(L.latLngBounds(allCoords), { padding: [60, 60], duration: 1, maxZoom: 14 });
                        setNearbyLegendOpen(false);
                      }}
                    >
                      <Maximize2 size={9} className="text-[#60a5fa]" />
                      <span style={{ fontSize: "9px", fontWeight: 600 }} className="text-[#60a5fa]">Fit All</span>
                    </button>
                  )}
                  <div className="flex flex-wrap gap-1 px-3 py-1.5 border-t border-white/5">
                    {(() => {
                      const typeCounts: Record<string, number> = {};
                      nearbyPlacesForPreview.forEach((p) => { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1; });
                      return Object.entries(typeCounts).map(([type, count]) => {
                        const iconInfo = NEARBY_PLACE_ICONS[type as NearbyPlace["type"]];
                        return (
                          <span key={type} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: `${iconInfo.color}22`, fontSize: "8px", color: iconInfo.color, fontWeight: 600 }}>
                            {iconInfo.emoji} {count}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isMobile && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0d1b2a]/80 backdrop-blur-md border border-white/10">
            <MapPin size={10} className="text-[#60a5fa]" />
            <p className="text-white/50" style={{ fontSize: "10px" }}>Click a pin to view the postcard. Tap to flip.</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {previewDest && previewPos && (
          <div key={previewDest.name + "-wrapper"} className="absolute z-[1100] pointer-events-none" style={{ left: `${previewPos.x}px`, top: `${previewPos.y - 56}px`, transform: "translate(-50%, -100%)" }}>
            <motion.div initial={{ opacity: 0, y: 12, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.25, ease: "easeOut" }} className="pointer-events-auto">
              {(() => {
                const dest = previewDest;
                const accentColor2 = getCategoryColor(dest.category);
                const isFav = favoritedNames.has(dest.name);
                const desc = descriptions[dest.name] || "";
                const pDate = (() => {
                  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
                  const hash = dest.name.length * 7 + dest.category.length * 13;
                  return { month: months[hash % 12], day: (hash % 28) + 1, year: 2024 + (hash % 3) };
                })();
                return (
                  <div className="relative cursor-pointer group" style={{ width: isMobile ? "220px" : "280px" }} onClick={(e) => { e.stopPropagation(); setSelectedDest(dest); setPreviewDest(null); setNearbyFocusDest(null); }}>
                    <div className="relative rounded-lg overflow-hidden shadow-[0_8px_30px_-4px_rgba(0,0,0,0.3)] transition-transform duration-200 group-hover:scale-[1.02]">
                      <AirmailBorder />
                      <div className="relative z-[1] m-[6px] rounded overflow-hidden" style={{ backgroundColor: "#f5f0e6" }}>
                        <div className={`relative w-full ${isMobile ? "h-[80px]" : "h-[100px]"} overflow-hidden`}>
                          <img src={dest.images[0]} alt={dest.name} className="w-full h-full object-cover" draggable={false} />
                          <div className="absolute inset-x-0 bottom-0 h-14 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)" }} />
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-sm text-white" style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", backgroundColor: `${accentColor2}cc` }}>{dest.category}</span>
                          {isFav && <div className="absolute top-2 right-2"><Heart size={12} className="text-red-500 fill-red-500 drop-shadow-md" /></div>}
                          <div className="absolute bottom-1.5 left-2.5 right-2.5 z-[1]"><h4 className="text-white truncate drop-shadow-sm" style={{ fontSize: isMobile ? "12px" : "14px", fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{dest.name}</h4></div>
                        </div>
                        <div className="relative px-3 py-2.5 flex gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <MapPin size={8} style={{ color: accentColor2 }} className="shrink-0" />
                              <span className="text-[#8b7e6a] truncate" style={{ fontSize: "9.5px" }}>{dest.places.slice(0, 2).join(" · ")}</span>
                            </div>
                            <div className="relative">
                              <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.05 }}>{[...Array(3)].map((_, i) => <div key={i} className="border-b border-[#4a3f30]" style={{ height: "18px" }} />)}</div>
                              <p className={`relative z-[1] ${isMobile ? "line-clamp-1" : "line-clamp-2"}`} style={{ fontFamily: "'Patrick Hand', cursive", fontSize: isMobile ? "11px" : "12px", lineHeight: "18px", color: "#3d3529" }}>{desc || `What a wonderful trip to ${dest.name.split(",")[0]}!`}</p>
                            </div>
                          </div>
                          {!isMobile && (
                            <div className="shrink-0 flex flex-col items-center relative" style={{ width: "44px" }}>
                              <div className="relative overflow-hidden flex flex-col items-center justify-center" style={{ width: "38px", height: "44px", border: "1px dashed #c4b89c", background: "linear-gradient(135deg, #faf7f0 0%, #f0ead8 100%)", borderRadius: "1px" }}>
                                <div className="w-7 h-7 rounded-sm overflow-hidden shadow-sm"><img src={dest.images[0]} alt="" className="w-full h-full object-cover" draggable={false} /></div>
                                <span style={{ fontSize: "4.5px", fontWeight: 700, color: "#8b7e6a", letterSpacing: "0.2px", textTransform: "uppercase", marginTop: "1px" }}>{dest.category}</span>
                              </div>
                              <div className="absolute -left-3 top-0.5 pointer-events-none" style={{ transform: "rotate(-12deg)", opacity: 0.2 }}>
                                <div className="w-[36px] h-[36px] rounded-full flex flex-col items-center justify-center" style={{ border: "1.5px solid #64503c" }}>
                                  <span style={{ fontSize: "4px", fontWeight: 700, color: "#64503c", letterSpacing: "0.3px" }}>{dest.name.split(",")[0]?.toUpperCase().slice(0, 8)}</span>
                                  <span style={{ fontSize: "5.5px", fontWeight: 800, color: "#64503c" }}>{pDate.month} {pDate.day}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {(() => {
                          const nearby = NEARBY_PLACES[dest.name];
                          if (!nearby || nearby.length === 0) return null;
                          return (
                            <div className="px-3 pb-1.5 cursor-pointer hover:bg-[#ebe5d6] transition-colors rounded-b" onClick={(e) => { e.stopPropagation(); const map = mapRef.current; if (!map) return; const destCoords = DESTINATION_COORDS[dest.name]; const allCoords: [number, number][] = nearby.map((p) => p.coords); if (destCoords) allCoords.push(destCoords); map.flyToBounds(L.latLngBounds(allCoords), { padding: [60, 60], duration: 0.8, maxZoom: 14 }); setNearbyFocusDest(dest); setPreviewDest(null); }}>
                              <div className="flex items-center gap-1.5 pt-1.5" style={{ borderTop: "1px dashed rgba(0,0,0,0.06)" }}>
                                <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden">
                                  {nearby.slice(0, isMobile ? 3 : 4).map((place) => {
                                    const pIcon = NEARBY_PLACE_ICONS[place.type];
                                    return (
                                      <div key={place.name} className="shrink-0 flex items-center gap-0.5 px-1 py-px rounded cursor-pointer hover:brightness-95 transition-all" style={{ backgroundColor: `${pIcon.color}10` }} title={`${place.name} — ${place.note}`} onClick={(e) => { e.stopPropagation(); const map = mapRef.current; if (!map) return; map.flyTo(place.coords, Math.max(map.getZoom(), 12), { duration: 0.6 }); setNearbyFocusDest(dest); setPreviewDest(null); setTimeout(() => { const m = nearbyMarkersRef.current.get(place.name); if (m) m.openPopup(); }, 700); }}>
                                        <span style={{ fontSize: "8px", lineHeight: 1 }}>{pIcon.emoji}</span>
                                        <span className="truncate" style={{ fontSize: "7.5px", fontWeight: 600, color: pIcon.color, maxWidth: isMobile ? "40px" : "50px" }}>{place.name.split(" ").slice(0, 2).join(" ")}</span>
                                      </div>
                                    );
                                  })}
                                  {nearby.length > (isMobile ? 3 : 4) && <span style={{ fontSize: "8px", color: "#8b7e6a", fontWeight: 600 }}>+{nearby.length - (isMobile ? 3 : 4)}</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex items-center justify-center gap-1 pb-1.5 opacity-40 group-hover:opacity-70 transition-opacity"><Mail size={8} className="text-[#8b7e6a]" /><span style={{ fontSize: "8px", fontWeight: 600, color: "#8b7e6a", letterSpacing: "0.5px" }}>TAP TO OPEN</span></div>
                      </div>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-[7px]" style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid #d43d3d", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.08))" }} />
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isMobile && !sidebarOpen && (
        <div className="absolute bottom-0 left-0 right-0 z-[999]">
          <div className="flex items-center px-3 pb-2">
            <div className="flex-1 flex justify-start">
              <button onClick={() => { const map = mapRef.current; if (!map || destinations.length === 0) return; map.flyToBounds(L.latLngBounds(destinations.map((d) => DESTINATION_COORDS[d.name]).filter(Boolean) as [number, number][]), { padding: [40, 40], duration: 1 }); setPreviewDest(null); setNearbyFocusDest(null); }} className="w-9 h-9 rounded-lg bg-[#0d1b2a]/90 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-95 transition-transform"><Maximize2 size={14} className="text-[#60a5fa]" /></button>
            </div>
            <div className="flex-1 flex justify-center">
              <AnimatePresence>
                {nearbyFocusDest && !previewDest && (
                  <motion.button key="show-postcard-btn-mobile" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="h-9 px-3 rounded-lg flex items-center gap-1.5 active:scale-95 transition-transform cursor-pointer" style={{ background: "linear-gradient(135deg, #faf7f0 0%, #f0ead8 100%)", border: "2px solid #d43d3d", boxShadow: "0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(212,61,61,0.15)" }} onClick={() => { const dest = nearbyFocusDest; setPreviewDest(dest); setNearbyFocusDest(null); updatePreviewPosition(dest); }}><Mail size={13} className="text-[#d43d3d]" /><span style={{ fontFamily: "'Patrick Hand', cursive", fontSize: "12px", fontWeight: 700, color: "#5c4033", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>Show Postcard</span></motion.button>
                )}
              </AnimatePresence>
            </div>
            <div className="flex-1 flex justify-end">
              <button onClick={() => setSidebarOpen(true)} className="h-9 px-3 rounded-lg bg-[#0d1b2a]/90 backdrop-blur-md border border-white/10 flex items-center gap-1.5 active:scale-95 transition-transform"><List size={13} className="text-[#60a5fa]" /><span className="text-white/70" style={{ fontSize: "10px", fontWeight: 600 }}>All Trips</span></button>
            </div>
          </div>
          <div className="relative">
            {mobileStripIndex > 0 && <button onClick={() => { const newIdx = Math.max(0, mobileStripIndex - 1); setMobileStripIndex(newIdx); setActiveSidebarDest(destinations[newIdx]?.name ?? null); stripCardRefs.current[destinations[newIdx]?.name ?? ""]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }} className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#0d1b2a]/90 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform"><ChevronLeft size={14} className="text-white/80" /></button>}
            {mobileStripIndex < destinations.length - 1 && <button onClick={() => { const newIdx = Math.min(destinations.length - 1, mobileStripIndex + 1); setMobileStripIndex(newIdx); setActiveSidebarDest(destinations[newIdx]?.name ?? null); stripCardRefs.current[destinations[newIdx]?.name ?? ""]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }} className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#0d1b2a]/90 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform"><ChevronRight size={14} className="text-white/80" /></button>}
            <div ref={stripScrollRef} className="flex gap-2.5 overflow-x-auto px-3 pb-3 pt-1 snap-x snap-mandatory hide-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
              {destinations.map((dest, idx) => {
                const color = getCategoryColor(dest.category);
                const isActive = mobileStripIndex === idx;
                return (
                  <div key={dest.name} ref={(el) => { stripCardRefs.current[dest.name] = el; }} className="snap-center shrink-0" style={{ width: "200px" }}>
                    <div onClick={() => { setMobileStripIndex(idx); setActiveSidebarDest(dest.name); stripCardRefs.current[dest.name]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }} className={`w-full rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.97] cursor-pointer ${isActive ? "shadow-lg" : "shadow-md"}`} style={{ border: isActive ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.08)", background: "rgba(13, 27, 42, 0.92)", backdropFilter: "blur(12px)" }}>
                      <div className="relative h-[72px] overflow-hidden rounded-t-xl">
                        <img src={dest.images[0]} alt={dest.name} className="w-full h-full object-cover" draggable={false} />
                        <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)" }} />
                        <div className="absolute top-2 left-2 rounded-full" style={{ width: 8, height: 8, backgroundColor: color, border: "1.5px solid white", boxShadow: `0 0 6px ${color}88` }} />
                        {favoritedNames.has(dest.name) && <Heart size={10} className="absolute top-2 right-2 text-red-500 fill-red-500 drop-shadow" />}
                      </div>
                      <div className="px-2.5 py-2 text-left">
                        <h5 className="text-white truncate" style={{ fontSize: "12px", fontWeight: 700 }}>{dest.name}</h5>
                        <div className="flex items-center gap-1 mt-0.5"><MapPin size={8} className="text-white/30 shrink-0" /><span className="text-white/40 truncate" style={{ fontSize: "9px" }}>{dest.places.slice(0, 2).join(" · ")}</span></div>
                      </div>
                      <div className="px-2.5 pb-2.5">
                        <button onClick={(e) => { e.stopPropagation(); handleSidebarCardClick(dest); }} className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg active:scale-[0.96] transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 pointer-events-none"}`} style={{ background: `linear-gradient(135deg, ${color}dd, ${color}99)`, boxShadow: isActive ? `0 2px 8px ${color}44` : "none" }}>
                          <Navigation size={10} className="text-white" style={{ transform: "rotate(90deg)" }} /><span className="text-white" style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.3px" }}>Go to Pin</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-center gap-1 pb-2.5">
            {destinations.map((_, idx) => <div key={idx} className="rounded-full transition-all" style={{ width: idx === mobileStripIndex ? 12 : 4, height: 4, backgroundColor: idx === mobileStripIndex ? "#60a5fa" : "rgba(255,255,255,0.15)" }} />)}
          </div>
        </div>
      )}

      {selectedDest && (
        <PostcardPopup
          dest={selectedDest}
          description={descriptions[selectedDest.name] || ""}
          isFavorited={favoritedNames.has(selectedDest.name)}
          onClose={() => setSelectedDest(null)}
          onToggleFavorite={() => toggleFavorite(selectedDest.name)}
        />
      )}
    </div>
  );
}
