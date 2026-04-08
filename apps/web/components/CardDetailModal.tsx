import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Heart, MapPin, Landmark, Calendar, Pencil, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import type { NearbyPlace } from "./GlobeData";
import { NEARBY_PLACE_ICONS } from "./GlobeData";

const AUTO_ADVANCE_MS = 5000;
const SWIPE_THRESHOLD = 50;

interface CardDetailModalProps {
  name: string;
  images: string[];
  category: string;
  places?: string[];
  highlights?: string[];
  duration?: string;
  description: string;
  isFavorited: boolean;
  onToggleFavorite?: () => void;
  onUpdateDescription: (desc: string) => void;
  onClose: () => void;
  initialSlide?: number;
  nearbyPlaces?: NearbyPlace[];
}

export function CardDetailModal({
  name,
  images,
  category,
  places,
  highlights,
  duration,
  description,
  isFavorited,
  onToggleFavorite,
  onUpdateDescription,
  onClose,
  initialSlide = 0,
  nearbyPlaces,
}: CardDetailModalProps) {
  const [current, setCurrent] = useState(initialSlide);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description);
  const [progressKey, setProgressKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const count = images.length;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback((i: number) => {
    setCurrent(((i % count) + count) % count);
    setProgressKey((k) => k + 1);
  }, [count]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-advance
  useEffect(() => {
    if (count <= 1 || paused) return;
    timerRef.current = setTimeout(next, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, count, paused, next, progressKey]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [next, prev, isEditing]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    touchStartRef.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next();
      else prev();
    }
  };

  const handleSave = () => {
    onUpdateDescription(draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(description);
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsClosing(true);
  };

  return (
    <AnimatePresence onExitComplete={onClose}>
      {!isClosing && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Close button */}
          <motion.button
            onClick={handleClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <X size={18} className="text-white" />
          </motion.button>

          {/* Modal card */}
          <motion.div
            className="relative bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row w-[95vw] max-w-[960px] max-h-[90vh] md:max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Image section */}
            <div
              className="relative w-full md:w-[60%] bg-[#1a1a1a] shrink-0 overflow-hidden aspect-square md:aspect-auto md:min-h-[500px]"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* All images stacked — crossfade via opacity */}
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    opacity: i === current ? 1 : 0,
                    transition: "opacity 0.6s ease-in-out",
                  }}
                  draggable={false}
                />
              ))}

              {/* Image counter */}
              {count > 1 && (
                <div
                  className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2.5 py-1 rounded-full z-10"
                  style={{ fontSize: "11px", fontWeight: 600 }}
                >
                  {current + 1} / {count}
                </div>
              )}

              {/* Nav arrows */}
              {count > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors z-10"
                  >
                    <ChevronLeft size={16} className="text-[#314158]" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md hover:bg-white transition-colors z-10"
                  >
                    <ChevronRight size={16} className="text-[#314158]" />
                  </button>
                </>
              )}

              {/* Dots with progress fill */}
              {count > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className="relative rounded-full overflow-hidden"
                      style={{
                        width: i === current ? 18 : 6,
                        height: 6,
                        backgroundColor: i === current ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.4)",
                        transition: "width 0.3s ease, background-color 0.3s ease",
                      }}
                    >
                      {i === current && (
                        <span
                          key={progressKey}
                          className="absolute inset-y-0 left-0 rounded-full bg-white"
                          style={{
                            animation: paused
                              ? "none"
                              : `progressFill ${AUTO_ADVANCE_MS}ms linear forwards`,
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="flex-1 flex flex-col min-w-0 md:w-[40%]">
              {/* Header row */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[#314158] truncate"
                    style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.2px" }}
                  >
                    {name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="inline-block bg-[#f0f4f8] px-2.5 py-0.5 rounded-full text-[#1e3a5f]"
                      style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}
                    >
                      {category}
                    </span>
                    {duration && (
                      <span className="flex items-center gap-1 text-[#9ca3af]" style={{ fontSize: "11px" }}>
                        <Calendar size={11} />
                        {duration}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.();
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isFavorited
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <Heart
                    size={16}
                    className={
                      isFavorited
                        ? "text-red-500 fill-red-500"
                        : "text-[#9ca3af]"
                    }
                  />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Places */}
                {places && places.length > 0 && (
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin size={14} className="text-[#4a9fd8] mt-0.5 shrink-0" />
                    <p className="text-[#6b7280]" style={{ fontSize: "12px" }}>
                      {places.join(" · ")}
                    </p>
                  </div>
                )}

                {/* Highlights */}
                {highlights && highlights.length > 0 && (
                  <div className="flex items-start gap-2 mb-4">
                    <Landmark size={14} className="text-[#8b5cf6] mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1.5">
                      {highlights.map((h) => (
                        <span
                          key={h}
                          className="bg-[#f5f3ff] text-[#7c3aed] px-2.5 py-0.5 rounded-full"
                          style={{ fontSize: "11px", fontWeight: 500 }}
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nearby Places */}
                {nearbyPlaces && nearbyPlaces.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={14} className="text-[#10b981] shrink-0" />
                      <p className="text-[#314158]" style={{ fontSize: "13px", fontWeight: 600 }}>
                        Nearby Places
                      </p>
                      <span
                        className="ml-auto px-1.5 py-0.5 rounded-full bg-[#10b981]/10 text-[#10b981]"
                        style={{ fontSize: "10px", fontWeight: 700 }}
                      >
                        {nearbyPlaces.length}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {nearbyPlaces.map((place) => {
                        const iconInfo = NEARBY_PLACE_ICONS[place.type];
                        return (
                          <div
                            key={place.name}
                            className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-[#f8fafc] hover:bg-[#f0f4f8] transition-colors"
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: `${iconInfo.color}15` }}
                            >
                              <span style={{ fontSize: "12px", lineHeight: 1 }}>{iconInfo.emoji}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[#314158] truncate" style={{ fontSize: "12px", fontWeight: 600 }}>
                                  {place.name}
                                </p>
                                <span
                                  className="shrink-0 px-1.5 py-px rounded-full capitalize"
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 600,
                                    color: iconInfo.color,
                                    backgroundColor: `${iconInfo.color}12`,
                                  }}
                                >
                                  {place.type}
                                </span>
                              </div>
                              <p className="text-[#9ca3af] mt-0.5" style={{ fontSize: "11px", lineHeight: 1.4 }}>
                                {place.note}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Type summary pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(() => {
                        const typeCounts: Record<string, number> = {};
                        nearbyPlaces.forEach((p) => {
                          typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
                        });
                        return Object.entries(typeCounts).map(([type, count]) => {
                          const iconInfo = NEARBY_PLACE_ICONS[type as NearbyPlace["type"]];
                          return (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                              style={{
                                background: `${iconInfo.color}10`,
                                fontSize: "10px",
                                color: iconInfo.color,
                                fontWeight: 600,
                              }}
                            >
                              {iconInfo.emoji} {count}
                            </span>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Trip Notes */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[#314158]" style={{ fontSize: "13px", fontWeight: 600 }}>
                      Trip Notes
                    </p>
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setDraft(description);
                          setIsEditing(true);
                        }}
                        className="flex items-center gap-1 text-[#4a9fd8] hover:text-[#3182ce] transition-colors"
                        style={{ fontSize: "12px" }}
                      >
                        <Pencil size={12} />
                        {description ? "Edit" : "Add notes"}
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Write about how your trip went..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[#314158] placeholder-[#9ca3af] resize-none focus:outline-none focus:ring-2 focus:ring-[#4a9fd8]/30 focus:border-[#4a9fd8]"
                        style={{ fontSize: "13px", minHeight: "100px" }}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1.5 rounded-lg text-[#6b7280] hover:bg-gray-100 transition-colors"
                          style={{ fontSize: "12px", fontWeight: 500 }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white hover:bg-[#2a4a6f] transition-colors"
                          style={{ fontSize: "12px", fontWeight: 500 }}
                        >
                          <Check size={12} />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : description ? (
                    <p
                      className="text-[#6b7280] whitespace-pre-wrap break-words"
                      style={{ fontSize: "13px", lineHeight: "1.6", overflowWrap: "break-word", wordBreak: "break-word" }}
                    >
                      {description}
                    </p>
                  ) : (
                    <p className="text-[#b0b8c1] italic" style={{ fontSize: "13px" }}>
                      No trip notes yet. Click "Add notes" to describe your experience.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}