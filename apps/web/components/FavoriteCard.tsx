import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Heart, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { CardDetailModal } from "./CardDetailModal";
import type { NearbyPlace } from "./GlobeData";
import { getCategoryColor } from "./GlobeData";

const AUTO_ADVANCE_MS = 4000;
const SWIPE_THRESHOLD = 40;
const DOUBLE_TAP_DELAY = 300;

// Varied image heights for masonry effect
const IMAGE_HEIGHTS: Record<string, string> = {
  "h-[340px]": "h-[310px]",
  "h-[420px]": "h-[390px]",
  "h-[300px]": "h-[270px]",
  "h-[380px]": "h-[350px]",
  "h-[330px]": "h-[300px]",
};

interface FavoriteCardProps {
  name: string;
  images: string[];
  category: string;
  places?: string[];
  highlights?: string[];
  duration?: string;
  description?: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  onUpdateDescription?: (desc: string) => void;
  heightClass?: string;
  variant?: "grid" | "list";
  listDensity?: "compact" | "comfortable";
  nearbyPlaces?: NearbyPlace[];
}

export function FavoriteCard({
  name,
  images,
  category,
  places,
  highlights,
  duration,
  description = "",
  isFavorited = false,
  onToggleFavorite,
  onUpdateDescription,
  heightClass = "h-[320px]",
  variant = "grid",
  listDensity = "comfortable",
  nearbyPlaces,
}: FavoriteCardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState<boolean[]>(() => images.map(() => false));
  const [progressKey, setProgressKey] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gesture tracking refs
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const didSwipeRef = useRef(false);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCountRef = useRef(0);

  const slideCount = images.length;
  const imgHeight = IMAGE_HEIGHTS[heightClass] || "h-[210px]";

  // Random offset per card instance so auto-advance doesn't sync across cards
  const autoAdvanceOffset = useRef(Math.random() * 3000);

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentSlide(((index % slideCount) + slideCount) % slideCount);
      setProgressKey((k) => k + 1);
    },
    [slideCount]
  );

  const next = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);

  // Auto-advance
  useEffect(() => {
    if (isHovered || slideCount <= 1) return;
    const delay = AUTO_ADVANCE_MS + autoAdvanceOffset.current;
    timerRef.current = setTimeout(next, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isHovered, next, slideCount, progressKey]);

  const handleImgLoad = useCallback((i: number) => {
    setImgLoaded((prev) => {
      const copy = [...prev];
      copy[i] = true;
      return copy;
    });
  }, []);

  const triggerHeartBurst = useCallback(() => {
    if (!isFavorited) {
      onToggleFavorite?.();
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 700);
  }, [isFavorited, onToggleFavorite]);

  // ── Touch handlers (mobile swipe + double-tap) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      t: Date.now(),
    };
    didSwipeRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    if (dx > 10) didSwipeRef.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    touchStartRef.current = null;

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      didSwipeRef.current = true;
      if (dx < 0) goToSlide(currentSlide + 1);
      else goToSlide(currentSlide - 1);
      return;
    }

    if (!didSwipeRef.current) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
        triggerHeartBurst();
      } else {
        singleTapTimerRef.current = setTimeout(() => {
          singleTapTimerRef.current = null;
          setDetailOpen(true);
        }, DOUBLE_TAP_DELAY);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if ((e.nativeEvent as any).pointerType === "touch" || e.detail === 0) {
      return;
    }

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          setDetailOpen(true);
        }
        clickCountRef.current = 0;
      }, DOUBLE_TAP_DELAY);
    } else if (clickCountRef.current === 2) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickCountRef.current = 0;
      triggerHeartBurst();
    }
  };

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const firstLoaded = imgLoaded[0];
  const firstPlace = places && places.length > 0 ? places[0] : null;
  const isCompact = listDensity === "compact";
  const accentColor = getCategoryColor(category);

  // ── Compact list card ──
  if (variant === "list" && isCompact) {
    const hasExtra = description || (highlights && highlights.length > 0);
    return (
      <>
        <div
          className="relative bg-card cursor-pointer rounded-xl overflow-hidden transition-all duration-300 flex group"
          style={{
            boxShadow: isHovered
              ? `0 4px 20px -4px ${accentColor}30, 0 2px 8px rgba(0,0,0,0.06)`
              : "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            transform: isHovered ? "translateY(-1px)" : "translateY(0)",
            borderLeft: `3px solid ${accentColor}`,
            background: isHovered
              ? `linear-gradient(135deg, ${accentColor}06 0%, var(--card) 50%)`
              : "var(--card)",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Thumbnail */}
          <div className="relative shrink-0 p-1.5">
            <div className="relative overflow-hidden w-[68px] h-[68px] rounded-lg sm:w-[76px] sm:h-[76px]">
              {!firstLoaded && (
                <div className="absolute inset-0 bg-muted overflow-hidden rounded-lg">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                      animation: "shimmer 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              )}
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover rounded-lg"
                  style={{
                    opacity: i === currentSlide && firstLoaded ? 1 : 0,
                    transform: isHovered ? "scale(1.08)" : "scale(1)",
                    transition: "opacity 0.6s ease-in-out, transform 0.5s ease-out",
                  }}
                  draggable={false}
                  onLoad={() => handleImgLoad(i)}
                />
              ))}
              {/* Heart burst */}
              {showHeartBurst && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                  <Heart
                    size={24}
                    className="text-white fill-white drop-shadow-lg"
                    style={{ animation: "heartBurst 0.7s ease-out forwards" }}
                  />
                </div>
              )}
              {/* Slide dots inside thumbnail */}
              {slideCount > 1 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToSlide(i);
                      }}
                      className="relative rounded-full overflow-hidden"
                      style={{
                        width: i === currentSlide ? 10 : 3,
                        height: 3,
                        backgroundColor: i === currentSlide ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.6)",
                        transition: "width 0.3s ease, background-color 0.3s ease",
                      }}
                    >
                      {i === currentSlide && (
                        <span
                          key={progressKey}
                          className="absolute inset-y-0 left-0 rounded-full bg-white"
                          style={{
                            animation: isHovered
                              ? "none"
                              : `progressFill ${AUTO_ADVANCE_MS}ms linear forwards`,
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {/* Slide counter badge on hover */}
              {slideCount > 1 && isHovered && (
                <span
                  className="absolute top-1 right-1 z-10 px-1 py-0.5 rounded bg-black/50 text-white backdrop-blur-sm"
                  style={{ fontSize: "8px", fontWeight: 600, lineHeight: 1 }}
                >
                  {currentSlide + 1}/{slideCount}
                </span>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center py-1.5">
            {/* Top row: name + heart */}
            <div className="flex items-center gap-1.5 min-w-0">
              <p
                className="text-card-foreground truncate flex-1 min-w-0"
                style={{ fontSize: "13.5px", fontWeight: 600, letterSpacing: "-0.2px" }}
              >
                {name}
              </p>
              {/* Heart button */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  if (singleTapTimerRef.current) {
                    clearTimeout(singleTapTimerRef.current);
                    singleTapTimerRef.current = null;
                  }
                }}
                className="shrink-0 w-[26px] h-[26px] rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: isFavorited ? `${accentColor}12` : "transparent",
                  transform: isFavorited ? "scale(1)" : "scale(0.9)",
                }}
              >
                <Heart
                  size={13}
                  className={`transition-all duration-300 ${
                    isFavorited
                      ? "text-red-500 fill-red-500"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  style={{
                    filter: isFavorited ? "drop-shadow(0 0 3px rgba(239,68,68,0.4))" : "none",
                  }}
                />
              </button>
            </div>
            {/* Meta row: category pill + place */}
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span
                className="shrink-0 px-1.5 py-px rounded-full"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: accentColor,
                  backgroundColor: `${accentColor}12`,
                  letterSpacing: "0.2px",
                }}
              >
                {category}
              </span>
              {firstPlace && (
                <>
                  <span className="text-muted-foreground mx-1.5" style={{ fontSize: "12px" }}>·</span>
                  <span className="text-muted-foreground truncate" style={{ fontSize: "12px" }}>
                    {firstPlace}
                  </span>
                </>
              )}
              {duration && (
                <>
                  <span className="text-muted-foreground mx-1.5" style={{ fontSize: "12px" }}>·</span>
                  <span className="text-muted-foreground shrink-0" style={{ fontSize: "12px" }}>
                    {duration}
                  </span>
                </>
              )}
            </div>
            {/* Hover reveal: description or highlight pills */}
            {hasExtra && (
              <div
                className="overflow-hidden"
                style={{
                  maxHeight: isHovered ? 24 : 0,
                  opacity: isHovered ? 1 : 0,
                  marginTop: isHovered ? 3 : 0,
                  transition: "max-height 0.3s ease, opacity 0.25s ease, margin-top 0.3s ease",
                }}
              >
                {highlights && highlights.length > 0 ? (
                  <div className="flex gap-1 flex-nowrap overflow-hidden">
                    {highlights.slice(0, 3).map((h) => (
                      <span
                        key={h}
                        className="shrink-0 px-1.5 py-px rounded text-muted-foreground"
                        style={{
                          fontSize: "9px",
                          backgroundColor: "var(--muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                ) : description ? (
                  <p
                    className="text-muted-foreground truncate"
                    style={{ fontSize: "10.5px", lineHeight: 1.4 }}
                  >
                    {description}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Detail modal */}
        {detailOpen &&
          createPortal(
            <CardDetailModal
              name={name}
              images={images}
              category={category}
              places={places}
              highlights={highlights}
              duration={duration}
              description={description}
              isFavorited={isFavorited}
              onToggleFavorite={onToggleFavorite}
              onUpdateDescription={(desc) => onUpdateDescription?.(desc)}
              onClose={() => setDetailOpen(false)}
              initialSlide={currentSlide}
              nearbyPlaces={nearbyPlaces}
            />,
            document.body
          )}
      </>
    );
  }

  if (variant === "list") {
    return (
      <>
        <div
          className="bg-card cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 flex group"
          style={{
            boxShadow: isHovered
              ? `0 8px 25px -5px ${accentColor}20, 0 4px 12px rgba(0,0,0,0.08)`
              : "0 2px 8px rgba(0,0,0,0.07)",
            transform: isHovered ? "translateY(-2px)" : "translateY(0)",
            borderLeft: `3px solid ${accentColor}`,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Thumbnail with inner rounding */}
          <div className={`relative shrink-0 ${isCompact ? "p-1.5" : "p-2"}`}>
            <div
              className={`relative overflow-hidden ${
                isCompact ? "w-[72px] h-[72px] rounded-xl sm:w-[80px] sm:h-[80px]" : "w-[160px] h-[120px] rounded-xl sm:w-[220px] sm:h-[150px]"
              }`}
            >
              {!firstLoaded && (
                <div className={`absolute inset-0 bg-muted overflow-hidden ${isCompact ? "rounded-lg" : "rounded-xl"}`}>
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                      animation: "shimmer 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              )}
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={name}
                  className={`absolute inset-0 w-full h-full object-cover ${isCompact ? "rounded-lg" : "rounded-xl"}`}
                  style={{
                    opacity: i === currentSlide && firstLoaded ? 1 : 0,
                    transform: isHovered ? "scale(1.05)" : "scale(1)",
                    transition: "opacity 0.6s ease-in-out, transform 0.6s ease-out",
                  }}
                  draggable={false}
                  onLoad={() => handleImgLoad(i)}
                />
              ))}
              {/* Heart burst */}
              {showHeartBurst && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                  <Heart
                    size={isCompact ? 26 : 40}
                    className="text-white fill-white drop-shadow-lg"
                    style={{ animation: "heartBurst 0.7s ease-out forwards" }}
                  />
                </div>
              )}
              {/* Category badge - only in comfortable */}
              {!isCompact && (
                <span
                  className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md bg-card/90 backdrop-blur-sm text-card-foreground"
                  style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.3px" }}
                >
                  {category}
                </span>
              )}
              {/* Slide dots */}
              {slideCount > 1 && !isCompact && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToSlide(i);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        if (singleTapTimerRef.current) {
                          clearTimeout(singleTapTimerRef.current);
                          singleTapTimerRef.current = null;
                        }
                        goToSlide(i);
                      }}
                      className="relative rounded-full overflow-hidden"
                      style={{
                        width: i === currentSlide ? 12 : 4,
                        height: 4,
                        backgroundColor: i === currentSlide ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.5)",
                        transition: "width 0.3s ease, background-color 0.3s ease",
                      }}
                    >
                      {i === currentSlide && (
                        <span
                          key={progressKey}
                          className="absolute inset-y-0 left-0 rounded-full bg-white"
                          style={{
                            animation: isHovered
                              ? "none"
                              : `progressFill ${AUTO_ADVANCE_MS}ms linear forwards`,
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {/* Compact: hover preview thumbnails overlay */}
              {isCompact && slideCount > 1 && isHovered && (
                <div
                  className="absolute inset-0 z-20 flex items-end justify-center rounded-xl"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }}
                >
                  <div className="flex gap-0.5 pb-1">
                    {images.map((src, i) => (
                      <button
                        key={i}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToSlide(i);
                        }}
                        className={`rounded overflow-hidden shrink-0 transition-all duration-200 ${
                          i === currentSlide
                            ? "ring-1 ring-white opacity-100"
                            : "opacity-50 hover:opacity-90"
                        }`}
                        style={{ width: 16, height: 16 }}
                      >
                        <img
                          src={src}
                          alt={`${name} ${i + 1}`}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Hover preview: mini image strip */}
            {!isCompact && images.length > 1 && (
              <div
                className="flex gap-1 mt-1.5 overflow-hidden"
                style={{
                  maxHeight: isHovered ? 40 : 0,
                  opacity: isHovered ? 1 : 0,
                  transition: "max-height 0.3s ease, opacity 0.25s ease",
                }}
              >
                {images.map((src, i) => (
                  <button
                    key={i}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSlide(i);
                    }}
                    className={`relative rounded-lg overflow-hidden shrink-0 transition-all duration-200 ${
                      i === currentSlide
                        ? "ring-2 ring-primary ring-offset-1"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    style={{ width: 48, height: 34 }}
                  >
                    <img
                      src={src}
                      alt={`${name} preview ${i + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className={`flex-1 min-w-0 pr-3 flex ${isCompact ? "items-center py-1.5" : "flex-col justify-center py-3 pr-4"}`}>
            {isCompact ? (
              /* Compact: streamlined single-row layout */
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p
                      className="text-card-foreground truncate"
                      style={{ fontSize: "14px", fontWeight: 600, letterSpacing: "-0.2px" }}
                    >
                      {name}
                    </p>
                  </div>
                  <div className="flex items-center gap-0 mt-1 min-w-0">
                    <span
                      className="text-primary shrink-0"
                      style={{ fontSize: "12px", fontWeight: 600, opacity: 0.6 }}
                    >
                      {category}
                    </span>
                    {firstPlace && (
                      <>
                        <span className="text-muted-foreground mx-1.5" style={{ fontSize: "12px" }}>·</span>
                        <span className="text-muted-foreground truncate" style={{ fontSize: "12px" }}>
                          {firstPlace}
                        </span>
                      </>
                    )}
                    {duration && (
                      <>
                        <span className="text-muted-foreground mx-1.5" style={{ fontSize: "12px" }}>·</span>
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "12px" }}>
                          {duration}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {/* Heart button */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    if (singleTapTimerRef.current) {
                      clearTimeout(singleTapTimerRef.current);
                      singleTapTimerRef.current = null;
                    }
                  }}
                  className={`shrink-0 w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all duration-200 ${
                    isFavorited
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart
                    size={14}
                    className={isFavorited ? "fill-red-500" : ""}
                  />
                </button>
              </div>
            ) : (
              /* Comfortable: original expanded layout */
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-card-foreground truncate"
                      style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.3px" }}
                    >
                      {name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {firstPlace && (
                        <div className="flex items-center gap-1">
                          <MapPin size={11} className="text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground truncate" style={{ fontSize: "11px" }}>
                            {firstPlace + (places && places.length > 1 ? ` + ${places.length - 1} more` : "")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Heart button */}
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite?.();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      if (singleTapTimerRef.current) {
                        clearTimeout(singleTapTimerRef.current);
                        singleTapTimerRef.current = null;
                      }
                    }}
                    className={`shrink-0 rounded-full flex items-center justify-center transition-all duration-200 border w-[32px] h-[32px] ${
                      isFavorited
                        ? "border-red-100 bg-red-50"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <Heart
                      size={14}
                      className={
                        isFavorited
                          ? "text-red-500 fill-red-500"
                          : "text-muted-foreground"
                      }
                    />
                  </button>
                </div>
                {/* Places chips */}
                {places && places.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {places.slice(0, 3).map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted text-card-foreground"
                        style={{ fontSize: "10px", fontWeight: 500 }}
                      >
                        <MapPin size={8} className="shrink-0" />
                        {p}
                      </span>
                    ))}
                    {places.length > 3 && (
                      <span className="text-muted-foreground" style={{ fontSize: "10px" }}>
                        +{places.length - 3}
                      </span>
                    )}
                  </div>
                )}
                {description && (
                  <p
                    className="text-muted-foreground mt-1.5 line-clamp-2"
                    style={{ fontSize: "11.5px", lineHeight: "1.5" }}
                  >
                    {description}
                  </p>
                )}
                {highlights && highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {highlights.slice(0, 4).map((h) => (
                      <span
                        key={h}
                        className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                        style={{ fontSize: "10px" }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Detail modal */}
        {detailOpen &&
          createPortal(
            <CardDetailModal
              name={name}
              images={images}
              category={category}
              places={places}
              highlights={highlights}
              duration={duration}
              description={description}
              isFavorited={isFavorited}
              onToggleFavorite={onToggleFavorite}
              onUpdateDescription={(desc) => onUpdateDescription?.(desc)}
              onClose={() => setDetailOpen(false)}
              initialSlide={currentSlide}
              nearbyPlaces={nearbyPlaces}
            />,
            document.body
          )}
      </>
    );
  }

  return (
    <>
      <div
        className="bg-card rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group"
        style={{
          boxShadow: isHovered
            ? `0 12px 28px -6px ${accentColor}25, 0 4px 12px rgba(0,0,0,0.08)`
            : "0 2px 8px rgba(0,0,0,0.07)",
          transform: isHovered ? "translateY(-3px)" : "translateY(0)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image section */}
        <div className={`relative ${imgHeight} overflow-hidden`}>
          {/* Shimmer skeleton */}
          {!firstLoaded && (
            <div className="absolute inset-0 bg-muted overflow-hidden">
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                  animation: "shimmer 1.5s ease-in-out infinite",
                }}
              />
            </div>
          )}

          {/* All images stacked — crossfade via opacity */}
          {images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: i === currentSlide && firstLoaded ? 1 : 0,
                transform: isHovered ? "scale(1.05)" : "scale(1)",
                transition: "opacity 0.6s ease-in-out, transform 0.6s ease-out",
              }}
              draggable={false}
              onLoad={() => handleImgLoad(i)}
            />
          ))}

          {/* Heart burst animation */}
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <Heart
                size={64}
                className="text-white fill-white drop-shadow-lg"
                style={{ animation: "heartBurst 0.7s ease-out forwards" }}
              />
            </div>
          )}

          {/* Heart button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              if (singleTapTimerRef.current) {
                clearTimeout(singleTapTimerRef.current);
                singleTapTimerRef.current = null;
              }
            }}
            className="absolute top-2.5 right-2.5 z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all duration-300 shadow-[0px_2px_6px_0px_rgba(0,0,0,0.15)] bg-card/95 hover:bg-card"
            style={{
              transform: isFavorited ? "scale(1)" : isHovered ? "scale(1.05)" : "scale(0.95)",
            }}
          >
            <Heart
              size={14}
              className={`transition-all duration-300 ${
                isFavorited
                  ? "text-red-500 fill-red-500"
                  : "text-muted-foreground"
              }`}
              style={{
                filter: isFavorited ? "drop-shadow(0 0 4px rgba(239,68,68,0.4))" : "none",
              }}
            />
          </button>

          {/* Category badge */}
          <span
            className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full backdrop-blur-sm transition-all duration-300"
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.3px",
              color: isHovered ? "white" : accentColor,
              backgroundColor: isHovered ? `${accentColor}cc` : "rgba(255,255,255,0.92)",
            }}
          >
            {category}
          </span>

          {/* Hover gradient veil at bottom */}
          <div
            className="absolute inset-x-0 bottom-0 z-[5] pointer-events-none"
            style={{
              height: "40%",
              background: isHovered
                ? "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)"
                : "linear-gradient(to top, rgba(0,0,0,0.08) 0%, transparent 100%)",
              transition: "background 0.4s ease",
            }}
          />
        </div>

        {/* Text content section */}
        <div className="px-3.5 py-3">
          <p
            className="text-card-foreground truncate"
            style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "-0.3px" }}
          >
            {name}
          </p>
          {firstPlace && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate" style={{ fontSize: "11px" }}>
                {firstPlace}{places && places.length > 1 ? ` + ${places.length - 1} more` : ""}
              </span>
            </div>
          )}
          {description && (
            <p
              className="text-muted-foreground mt-1.5 line-clamp-2"
              style={{ fontSize: "11.5px", lineHeight: "1.5" }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detailOpen &&
        createPortal(
          <CardDetailModal
            name={name}
            images={images}
            category={category}
            places={places}
            highlights={highlights}
            duration={duration}
            description={description}
            isFavorited={isFavorited}
            onToggleFavorite={onToggleFavorite}
            onUpdateDescription={(desc) => onUpdateDescription?.(desc)}
            onClose={() => setDetailOpen(false)}
            initialSlide={currentSlide}
            nearbyPlaces={nearbyPlaces}
          />,
          document.body
        )}
    </>
  );
}