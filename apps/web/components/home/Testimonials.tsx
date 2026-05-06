"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Star, ChevronDown, ChevronLeft, ChevronRight, User } from "lucide-react";
import { EASE_OUT_EXPO } from "@travyl/shared";

interface Testimonial {
  name: string;
  location: string;
  snippet: string;
  quote: string;
  rating: number;
  avatarImg: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Alex Chen",
    location: "San Francisco, CA",
    snippet: "\"The real-time collaboration saved us from the endless 'can you add this to the spreadsheet' back-and-forth.\"",
    quote: "We planned a 2-week Japan trip with 4 friends using Travyl. The real-time collaboration saved us from the endless 'can you add this to the spreadsheet' back-and-forth. Everyone could add their must-visit spots and we had a final itinerary in 20 minutes.",
    rating: 5,
    avatarImg: 1,
  },
  {
    name: "Sarah Mitchell",
    location: "London, UK",
    snippet: "\"I typed '3 days in Rome with good pasta and art' and it built a complete itinerary.\"",
    quote: "I've tried every trip planner out there. Travyl is the first one that actually understands natural language. I typed '3 days in Rome with good pasta and art' and it built a complete itinerary. The AI suggestions were surprisingly spot-on.",
    rating: 5,
    avatarImg: 5,
  },
  {
    name: "Marcus Johnson",
    location: "New York, NY",
    snippet: "\"Planning a family vacation with kids is usually chaos. Travyl's day-by-day calendar made it so simple.\"",
    quote: "Planning a family vacation with kids is usually chaos. Travyl's day-by-day calendar made it so simple — we could see the pacing at a glance and adjust activities that would be too much for the kids. Game changer for family trips.",
    rating: 5,
    avatarImg: 12,
  },
  {
    name: "Priya Patel",
    location: "Toronto, Canada",
    snippet: "\"I mainly travel solo and Travyl is perfect for that. I just tell it what I'm looking for and get a solid plan.\"",
    quote: "I mainly travel solo and Travyl is perfect for that. I don't need a group — I just tell it what I'm looking for and get a solid plan. The budget tracking helps me keep costs in check without doing math in my head.",
    rating: 4,
    avatarImg: 25,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= count ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ t, i, carousel }: { t: Testimonial; i: number; carousel?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const children = (
    <>
      <Stars count={t.rating} />
      <div className="mt-3 mb-5">
        {!expanded ? (
          <p className="text-sm text-magazine-text leading-relaxed italic">
            {t.snippet}
          </p>
        ) : (
          <p className="text-sm text-magazine-text leading-relaxed">
            &ldquo;{t.quote}&rdquo;
          </p>
        )}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-magazine-accent hover:text-[#a07e2e] dark:hover:text-magazine-accent/80 transition-colors"
        >
          {expanded ? "Show less" : "Read the full story"}
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <div className="flex items-center gap-3">
        {avatarError ? (
          <div className="w-10 h-10 rounded-full shrink-0 ring-2 ring-white dark:ring-[var(--magazine-surface)] bg-[#1e3a5f] flex items-center justify-center">
            <User size={14} className="text-white/70" />
          </div>
        ) : (
          <img
            src={`https://i.pravatar.cc/80?img=${t.avatarImg}`}
            alt={t.name}
            loading="lazy"
            onError={() => setAvatarError(true)}
            className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-[var(--magazine-surface)]"
          />
        )}
        <div>
          <p className="text-sm font-semibold text-magazine-heading">{t.name}</p>
          <p className="text-xs text-magazine-text">{t.location}</p>
        </div>
      </div>
    </>
  );

  if (carousel) {
    return (
      <div className="group rounded-2xl bg-white/70 dark:bg-magazine-surface/80 backdrop-blur-sm border border-[#c4a882]/30 dark:border-white/[0.08] p-6 sm:p-8 hover:bg-white/90 dark:hover:bg-magazine-surface hover:shadow-lg hover:shadow-[#c4a882]/10 dark:hover:shadow-black/20 transition-all duration-300">
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: i * 0.08, ease: EASE_OUT_EXPO }}
      className="group rounded-2xl bg-white/70 dark:bg-magazine-surface/80 backdrop-blur-sm border border-[#c4a882]/30 dark:border-white/[0.08] p-6 sm:p-8 hover:bg-white/90 dark:hover:bg-magazine-surface hover:shadow-lg hover:shadow-[#c4a882]/10 dark:hover:shadow-black/20 transition-all duration-300"
    >
      {children}
    </motion.div>
  );
}

const carouselVariants = {
  enter: (d: number) => ({
    x: d > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (d: number) => ({
    x: d > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((i) => (i + 1) % TESTIMONIALS.length);
  }, []);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((i) => (i === 0 ? TESTIMONIALS.length - 1 : i - 1));
  }, []);

  // Auto-advance on mobile
  useEffect(() => {
    if (isPaused || TESTIMONIALS.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setDirection(1);
      setCurrentIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, currentIndex]);

  return (
    <section className="py-20 sm:py-28 px-6 bg-sand-base">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-magazine-accent">
            Loved by Travelers
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal mt-2 leading-tight text-magazine-heading tracking-wide">
            Real travelers, <span className="italic">real results</span>
          </h2>
          <p className="text-sm text-magazine-text mt-2 max-w-lg mx-auto leading-relaxed">
            Here&apos;s what people are saying about planning with Travyl.
          </p>
        </div>

        {/* Mobile carousel — only below md */}
        {TESTIMONIALS.length > 1 ? (
          <div className="md:hidden">
            <div
              role="region"
              aria-roledescription="carousel"
              aria-label="Testimonials carousel"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            >
              <AnimatePresence mode="popLayout" custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={carouselVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                  role="group"
                  aria-label={`Testimonial ${currentIndex + 1} of ${TESTIMONIALS.length}`}
                  aria-live="polite"
                >
                  <TestimonialCard t={TESTIMONIALS[currentIndex]} i={currentIndex} carousel />
                </motion.div>
              </AnimatePresence>

              {/* Dot indicators */}
              <div className="flex items-center justify-center gap-2 mt-6" role="tablist" aria-label="Testimonial navigation">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i === currentIndex
                        ? "bg-magazine-accent w-5"
                        : "bg-magazine-text/20 hover:bg-magazine-text/40"
                    }`}
                    role="tab"
                    aria-selected={i === currentIndex}
                    aria-current={i === currentIndex ? "true" : undefined}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </div>

              {/* Arrow controls */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={goPrev}
                  className="w-9 h-9 rounded-full border border-magazine-border flex items-center justify-center text-magazine-text hover:bg-magazine-surface/80 transition-colors"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs text-magazine-text/60 tabular-nums">
                  {currentIndex + 1} / {TESTIMONIALS.length}
                </span>
                <button
                  onClick={goNext}
                  className="w-9 h-9 rounded-full border border-magazine-border flex items-center justify-center text-magazine-text hover:bg-magazine-surface/80 transition-colors"
                  aria-label="Next testimonial"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Single testimonial — no carousel controls */
          <div className="md:hidden">
            <TestimonialCard t={TESTIMONIALS[0]} i={0} />
          </div>
        )}

        {/* Desktop grid — hidden below md */}
        <div className="hidden md:grid md:grid-cols-2 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name} t={t} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
