"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "motion/react";
import { Search, Sparkles, MapPin } from "lucide-react";
import { useHomeScreen, useHeroConfig, usePlaceImages, useTripPlanner, useAuthStore, EASE_OUT_EXPO } from "@travyl/shared";
import type { FollowUpQuestion } from "@travyl/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { savePlanToSupabase } from "@travyl/shared/src/services/api";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { TypeWriter } from "@/components/TypeWriter";
import { useCyclingPlaceholder } from "@/hooks/useCyclingPlaceholder";
import dynamic from "next/dynamic";

const TakeoffTransition = dynamic(
  () => import("@/components/home/TakeoffTransition").then((m) => ({ default: m.TakeoffTransition })),
  { ssr: false }
);
const Footer = dynamic(
  () => import("@/components/home/Footer").then((m) => ({ default: m.Footer })),
  { ssr: false }
);
const ProductDemo = dynamic(
  () => import("@/components/home/ProductDemo").then((m) => ({ default: m.ProductDemo })),
  { ssr: false }
);
const UseCases = dynamic(
  () => import("@/components/home/UseCases").then((m) => ({ default: m.UseCases })),
  { ssr: false }
);
const PressStats = dynamic(
  () => import("@/components/home/PressStats").then((m) => ({ default: m.PressStats })),
  { ssr: false }
);

const Testimonials = dynamic(
  () => import("@/components/home/Testimonials").then((m) => ({ default: m.Testimonials })),
  { ssr: false }
);
const TagUs = dynamic(
  () => import("@/components/home/TagUs").then((m) => ({ default: m.TagUs })),
  { ssr: false }
);
const FinalCTA = dynamic(
  () => import("@/components/home/FinalCTA").then((m) => ({ default: m.FinalCTA })),
  { ssr: false }
);
const MobileShowcase = dynamic(
  () => import("@/components/home/MobileShowcase").then((m) => ({ default: m.MobileShowcase })),
  { ssr: false }
);

// ─── Pick random items from an array (Fisher-Yates) ──────────
function pickRandom<T>(arr: readonly T[], count: number): T[] {
  const pool = [...arr];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

const PLACEHOLDER_PHRASES = [
  "7 days in Paris with my partner...",
  "A week in Tokyo exploring street food...",
  "Family beach vacation in Bali...",
  "Weekend getaway to the Swiss Alps...",
  "Solo backpacking through Southeast Asia...",
  "Honeymoon in Santorini...",
  "Road trip along the Amalfi Coast...",
  "Surf trip to Costa Rica...",
  "Wine tour through Tuscany...",
  "Digital nomad trip to Lisbon...",
  "Wellness retreat in Bali...",
  "Ski holiday in the French Alps...",
];

const TRIP_TYPE_PILLS = [
  { id: "tt-1", label: "Beach vacation" },
  { id: "tt-2", label: "Solo backpacking" },
  { id: "tt-3", label: "Honeymoon" },
  { id: "tt-4", label: "Road trip" },
  { id: "tt-5", label: "Family trip" },
];

const TRAVEL_STYLE_PILLS = [
  { id: "ts-1", label: "Luxury escape" },
  { id: "ts-2", label: "Budget adventure" },
  { id: "ts-3", label: "Cultural immersion" },
  { id: "ts-4", label: "Wellness retreat" },
];

/**
 * Upgrade a hero background image URL to a 4K-width variant when the source
 * CDN supports query-param resizing. Pexels and Unsplash both honor `w=`;
 * we set `w=3840` (4K width). For Pexels we also bump `dpr` to 2 to hit
 * retina densities. Returns the original URL untouched when the host isn't
 * a known resizer, so the hero never breaks if the API returns a third-
 * party CDN that ignores the params.
 */
function upgradeHeroImageUrl(url: string): string {
  // Pexels CDN — `w` controls resize width, `dpr` is density.
  if (url.includes('images.pexels.com')) {
    if (!url.includes('?')) return `${url}?auto=compress&cs=tinysrgb&w=3840&dpr=2`;
    let next = url;
    next = /w=\d+/.test(next) ? next.replace(/w=\d+/, 'w=3840') : `${next}&w=3840`;
    next = /dpr=\d+/.test(next) ? next.replace(/dpr=\d+/, 'dpr=2') : `${next}&dpr=2`;
    // The default Pexels `h=650` keeps the height locked, defeating the
    // wider `w` upgrade. Drop it so the CDN keeps the source aspect ratio.
    next = next.replace(/[?&]h=\d+/, '');
    return next;
  }
  // Unsplash CDN — `w` resize, `q` quality, `auto=format` lets the CDN pick
  // AVIF/WebP. Default home-page lookups come back at w=1080 (sub-1080p),
  // which looked blurry on retina displays.
  if (url.includes('images.unsplash.com')) {
    let next = url;
    if (!next.includes('?')) {
      return `${next}?auto=format&fit=max&q=80&w=3840`;
    }
    next = /w=\d+/.test(next) ? next.replace(/w=\d+/, 'w=3840') : `${next}&w=3840`;
    next = /q=\d+/.test(next) ? next.replace(/q=\d+/, 'q=85') : `${next}&q=85`;
    return next;
  }
  return url;
}

const ACTIVITY_PILLS = [
  { id: "ac-1", label: "Food & wine tour" },
  { id: "ac-2", label: "Ski holiday" },
  { id: "ac-3", label: "Surf trip" },
  { id: "ac-4", label: "Scuba diving" },
];

const PILLS_VISIBLE = 4;

interface AutocompleteSuggestion {
  id: string;
  name: string;
  country: string;
  fullName: string;
}

const HeroSearchInput = memo(function HeroSearchInput({
  tripQuery,
  setTripQuery,
  onSearch,
  onSelectDestination,
  staticPlaceholder,
  inputRef,
}: {
  tripQuery: string;
  setTripQuery: (v: string) => void;
  onSearch: () => void;
  onSelectDestination?: (destination: string) => void;
  staticPlaceholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const typingPlaceholder = useCyclingPlaceholder(PLACEHOLDER_PHRASES);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch suggestions as user types
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}&mode=destination&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
          setSelectedIdx(-1);
        }
      } catch {}
    }, 250);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTripQuery(val);
    fetchSuggestions(val);
  }, [setTripQuery, fetchSuggestions]);

  const handleSelect = useCallback((suggestion: AutocompleteSuggestion) => {
    setTripQuery(suggestion.fullName);
    setShowSuggestions(false);
    setSuggestions([]);
    onSelectDestination?.(suggestion.fullName);
  }, [setTripQuery, onSelectDestination]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") onSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0) {
        handleSelect(suggestions[selectedIdx]);
      } else {
        setShowSuggestions(false);
        onSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, selectedIdx, onSearch, handleSelect]);

  return (
    <div className="flex-1 flex items-center gap-3 px-4 min-w-0 relative">
      <Search className="text-gray-400 shrink-0" size={18} />
      <input
        ref={inputRef}
        type="text"
        value={tripQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={tripQuery ? "" : (staticPlaceholder ?? typingPlaceholder)}
        className="flex-1 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 min-w-0"
        autoComplete="off"
        aria-label="Search destinations"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                i === selectedIdx ? "bg-[#1e3a5f]/10 text-[#1e3a5f]" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <MapPin size={14} className="text-gray-400 shrink-0" />
              <span className="font-medium">{s.name}</span>
              <span className="text-gray-400 text-xs">{s.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Follow-up question option card ─────────────────────────
function OptionCard({ label, index, selected, onSelect }: {
  label: string; index: number; selected: boolean; onSelect: () => void;
}) {
  const keys = ["A", "B", "C", "D", "E"];
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all duration-200 w-full backdrop-blur-md ${
        selected
          ? "bg-[#1e3a5f] text-white shadow-lg ring-1 ring-white/40"
          : "bg-black/45 text-white hover:bg-black/55 border border-white/25 shadow-md"
      }`}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
        selected ? "bg-white/20 text-white" : "bg-white/15 text-white/85"
      }`}>
        {selected ? "✓" : keys[index] || index + 1}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    tripQuery,
    setTripQuery,
  } = useHomeScreen();
  const { data: heroConfig } = useHeroConfig();

  const heroSectionRef = useRef<HTMLElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const [showTakeoff, setShowTakeoff] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // API-driven planning flow
  const planner = useTripPlanner();
  const handlePlanTrip = useCallback(
    (prompt: string, context?: { city?: string; country?: string }) => {
      setTripQuery("");
      skipQuestionsRef.current = true;
      skipRetryCountRef.current = 0;
      clarifyRoundRef.current = 0;
      planner.submitPrompt(prompt, context);
    },
    [planner, setTripQuery]
  );
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [showQuestions, setShowQuestions] = useState(false);
  const skipQuestionsRef = useRef(false);
  const clarifyRoundRef = useRef(0);
  const skipRetryCountRef = useRef(0);

  const isClarifying = planner.state.phase === 'clarifying';
  const isExtracting = planner.state.phase === 'extracting';
  const isPlanning = planner.state.phase === 'planning';
  const questions: FollowUpQuestion[] = planner.state.phase === 'clarifying' ? planner.state.questions : [];
  const currentQuestion = questions[currentQIdx];

  // Surface clarifying questions immediately when the planner asks for them.
  // Previously this issued an empty-answers retry round to try to bypass
  // questions when the backend extraction was confident; the FastAPI backend
  // always returns questions for sparse prompts though, so the retry was a
  // ~3–5s loading flash with no benefit. Skip the round-trip and show the
  // question UI on the first clarifying response.
  useEffect(() => {
    if (isClarifying) {
      skipQuestionsRef.current = false;
      skipRetryCountRef.current = 0;
      setShowTakeoff(false);
      setShowQuestions(true);
    }
  }, [isClarifying]);

  // Cycling placeholders live in isolated memo components above
  // to avoid re-rendering the entire page every ~25ms

  // Trending destination pills from SerpAPI (cached 6h server-side)
  const { data: trendingDestinations } = useQuery({
    queryKey: ['trending-destinations'],
    queryFn: async () => {
      const res = await fetch('/api/trending-destinations');
      if (!res.ok) return [];
      return res.json() as Promise<{ name: string; country: string; thumbnail: string | null }[]>;
    },
    staleTime: 30 * 60 * 1000,
    refetchOnMount: false,
    retry: 2,
    retryDelay: 2000,
  });

  // Live stats for compact trust bar
  const { data: stats } = useQuery({
    queryKey: ['live-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) return { destinations: 0, travelers: 0, trips: 0 };
      return res.json() as Promise<{ destinations: number; travelers: number; trips: number }>;
    },
    staleTime: 60 * 1000,
    retry: 2,
    retryDelay: 2000,
  });

  // Live inspirational travel quote
  const { data: quote } = useQuery({
    queryKey: ['hero-quote'],
    queryFn: async () => {
      const res = await fetch('/api/quote?tag=travel');
      if (!res.ok) return null;
      return res.json() as Promise<{ content: string; author: string }>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const allDestinationPills = (trendingDestinations ?? []).map((d, i) => ({ id: `td-${i}`, label: d.name }));
  const hasDestinations = allDestinationPills.length > 0;
  const destGroupCount = Math.ceil(allDestinationPills.length / PILLS_VISIBLE);
  const categoryCount = hasDestinations ? 4 : 3;

  // Categories array — first entry is dynamic, rest are static
  const CATEGORIES = hasDestinations
    ? [
        { label: "Destination", pills: allDestinationPills },
        { label: "Trip Type",  pills: TRIP_TYPE_PILLS },
        { label: "Style",      pills: TRAVEL_STYLE_PILLS },
        { label: "Activity",   pills: ACTIVITY_PILLS },
      ]
    : [
        { label: "Trip Type",  pills: TRIP_TYPE_PILLS },
        { label: "Style",      pills: TRAVEL_STYLE_PILLS },
        { label: "Activity",   pills: ACTIVITY_PILLS },
      ];

  const [pillCategory, setPillCategory] = useState(0);
  const [pillGroup, setPillGroup] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pillCategory === 0 && hasDestinations && destGroupCount > 1) {
        // Destinations: advance group within category
        setPillGroup((prev) => {
          const next = prev + 1;
          if (next >= destGroupCount) {
            setPillCategory((pc) => (pc + 1) % categoryCount);
            return 0;
          }
          return next;
        });
      } else {
        // Static category or single destination group: advance category
        setPillCategory((pc) => (pc + 1) % categoryCount);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [pillCategory, hasDestinations, destGroupCount, categoryCount]);

  // Resolve current pills to show
  const currentCategory = CATEGORIES[pillCategory];
  const visiblePills = currentCategory.pills.slice(
    pillGroup * PILLS_VISIBLE,
    pillGroup * PILLS_VISIBLE + PILLS_VISIBLE
  );

  // Parallax transforms — scoped to hero section so JS stops running once hero leaves viewport
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroSectionRef,
    offset: ["start start", "end start"],
  });
  const heroTextY = useTransform(heroScroll, [0, 0.6], [0, 150]);
  const heroTextOpacity = useTransform(heroScroll, [0, 0.4], [1, 0]);
  const heroBgY = useTransform(heroScroll, [0, 1], [0, -120]);
  const heroBgScale = useTransform(heroScroll, [0, 1], [1, 1.15]);

  // Hero slideshow — use live trending destinations, fall back to curated pool
  const FALLBACK_HERO_DESTINATIONS = ["Paris", "Tokyo", "New York City", "Bali"];
  const heroDestinations = useMemo(() => {
    const count = heroConfig?.background_image_url ? 3 : 4;
    const source = trendingDestinations && trendingDestinations.length > 0
      ? trendingDestinations.map((d) => d.name)
      : FALLBACK_HERO_DESTINATIONS;
    return pickRandom(source, count);
  }, [trendingDestinations, heroConfig?.background_image_url]);
  const heroImageQueries = usePlaceImages(heroDestinations);

  // Only include slides that have actually loaded
  const heroSlides = useMemo(() => {
    if (heroConfig?.background_image_url) return [heroConfig.background_image_url];
    const loaded = heroImageQueries
      .map((q) => q.data?.url)
      .filter((url): url is string => !!url)
      .map(upgradeHeroImageUrl);
    return loaded.length > 0 ? loaded : [
      `https://images.pexels.com/photos/30978583/pexels-photo-30978583.jpeg?auto=compress&cs=tinysrgb&w=3840&dpr=2`
    ];
  }, [heroConfig?.background_image_url, heroImageQueries]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Flatten multi-select answers into strings for the planner API
  const flattenAnswers = useCallback((answers: Record<string, string[]>) => {
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers)) {
      flat[k] = v.join(", ");
    }
    return flat;
  }, []);

  // Select an option — auto-advances after brief pause
  const handleOptionSelect = useCallback((questionId: string, option: string) => {
    const current = selectedAnswers[questionId] ?? [];
    const isDeselecting = current.includes(option);
    const newSelection = isDeselecting
      ? current.filter((o) => o !== option)
      : [...current, option];

    setSelectedAnswers((prev) => ({ ...prev, [questionId]: newSelection }));

    // Auto-advance after selecting (not deselecting)
    if (!isDeselecting) {
      setTimeout(() => {
        setCurrentQIdx((i) => {
          if (i < questions.length - 1) {
            return i + 1;
          } else {
            setShowTakeoff(true);
            // Read latest answers from state via functional updater
            setSelectedAnswers((latest) => {
              planner.submitAnswers(flattenAnswers(latest));
              return latest;
            });
            return i;
          }
        });
      }, 600);
    }
  }, [questions.length, planner, flattenAnswers]);

  // Advance to next question or submit
  const handleNextQuestion = useCallback(() => {
    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx((i) => i + 1);
    } else {
      // All questions done — submit
      setShowTakeoff(true);
      planner.submitAnswers(flattenAnswers(selectedAnswers));
    }
  }, [currentQIdx, questions.length, planner, selectedAnswers, flattenAnswers]);

  // Skip this question entirely
  const handleSkipQuestion = useCallback(() => {
    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx((i) => i + 1);
    } else {
      setShowTakeoff(true);
      planner.submitAnswers(flattenAnswers(selectedAnswers));
    }
  }, [currentQIdx, questions.length, planner, selectedAnswers, flattenAnswers]);

  // Handle keyboard shortcuts for options (A-E to toggle, Enter to advance, S to skip)
  useEffect(() => {
    if (!isClarifying || !currentQuestion) return;
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in a custom input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const opts = currentQuestion.options;
      let idx = -1;
      if (e.key >= '1' && e.key <= '5') idx = parseInt(e.key) - 1;
      else if (e.key.toLowerCase() >= 'a' && e.key.toLowerCase() <= 'e') idx = e.key.toLowerCase().charCodeAt(0) - 97;
      if (idx >= 0 && idx < opts.length) {
        handleOptionSelect(currentQuestion.id, opts[idx]);
      }
      if (e.key === 'Enter') handleNextQuestion();
      if (e.key.toLowerCase() === 's' && e.ctrlKey) { e.preventDefault(); handleSkipQuestion(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isClarifying, currentQuestion, handleOptionSelect, handleNextQuestion, handleSkipQuestion]);

  const handleConvReset = useCallback(() => {
    planner.reset();
    setCurrentQIdx(0);
    setSelectedAnswers({});
    setShowQuestions(false);
    setValidationError(null);
    setLoadingError(null);
    skipQuestionsRef.current = false;
    skipRetryCountRef.current = 0;
    setTripQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [planner, setTripQuery]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [takeoffCompleted, setTakeoffCompleted] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const isSaving = useRef(false);
  const user = useAuthStore((s) => s.user);

  // Clear validation error when user edits the search query
  useEffect(() => {
    if (tripQuery && validationError) setValidationError(null);
  }, [tripQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Validate trip queries — catch obviously nonsensical inputs
  const validateTripQuery = (query: string): string | null => {
    const lower = query.toLowerCase().trim();

    // Extract explicit duration mentions like "1000 days", "2 years", "3 months"
    const durationMatch = lower.match(/(\d+)\s*(day|days?|week|weeks?|month|months?|year|years?)/);
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2];
      // Convert to approximate days for comparison
      let approxDays = num;
      if (unit.startsWith('week')) approxDays = num * 7;
      else if (unit.startsWith('month')) approxDays = num * 30;
      else if (unit.startsWith('year')) approxDays = num * 365;

      if (approxDays > 365) return `A ${num}-${unit} trip seems a bit long — try something under a year.`;
      if (approxDays === 0) return `How about a trip with at least one day to explore?`;
    }

    // Reject purely numeric queries
    if (/^\d+$/.test(lower)) return `Try describing a destination instead of just numbers.`;

    // Reject queries that are too short to be meaningful
    if (lower.length < 3) return `Tell us a bit more about where you'd like to go.`;

    // Reject obviously non-travel queries
    const nonsensePatterns = [
      /^(hi|hello|test|asdf|qwerty|lol|haha)\s*$/i,
      /^(what|how)\s+(is|are|do)\b/i,
      /^(why|when|who)\b.*\?$/i,
      /^\d+\s*(km|miles?|kg|lbs?|liters?|gallons?)$/i,
    ];
    for (const pat of nonsensePatterns) {
      if (pat.test(lower)) return `Looks like you're asking something else — try describing a trip you'd like to plan.`;
    }

    return null;
  };

  const onSearch = () => {
    const val = tripQuery.trim();
    if (!val) return;
    // Validate query before proceeding
    const vErr = validateTripQuery(val);
    if (vErr) {
      setValidationError(vErr);
      return;
    }
    setValidationError(null);
    skipQuestionsRef.current = true;
    skipRetryCountRef.current = 0;
    clarifyRoundRef.current = 0;
    // Enhance short/vague prompts so the API has enough to plan with
    const words = val.split(/\s+/).length;
    const prompt = words <= 3 && !val.match(/\d/)
      ? `Plan a 5-day trip to ${val}`
      : val;
    planner.submitPrompt(prompt);
    setTripQuery("");
  };

  // After sign-in: save a stored plan or resume a pending trip prompt
  useEffect(() => {
    if (!user) return;
    setShowAuthGate(false);

    let storedPlan: string | null = null;
    try { storedPlan = sessionStorage.getItem('pending-trip-plan'); } catch {}
    if (storedPlan) {
      try { sessionStorage.removeItem('pending-trip-plan'); } catch {}
      (async () => {
        try {
          const plan = JSON.parse(storedPlan);
          const tripId = await savePlanToSupabase(plan as any);
          queryClient.invalidateQueries({ queryKey: ['trips'] });
          router.push(`/trip/${tripId}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to save trip';
          setLoadingError(msg);
        }
      })();
      return;
    }

    let pending: string | null = null;
    try { pending = sessionStorage.getItem('pending-trip-prompt'); } catch {}
    if (!pending) return;
    try { sessionStorage.removeItem('pending-trip-prompt'); } catch {}
    skipQuestionsRef.current = true;
    skipRetryCountRef.current = 0;
    clarifyRoundRef.current = 0;
    planner.submitPrompt(pending);
  }, [user]);

  // Show takeoff when planning starts
  useEffect(() => {
    if ((planner.state.phase === 'extracting' || planner.state.phase === 'planning') && !showTakeoff) {
      const rect = searchButtonRef.current?.getBoundingClientRect() ?? null;
      setButtonRect(rect);
      setShowTakeoff(true);
      setLoadingError(null);
      setTakeoffCompleted(false);
    }
    if (planner.state.phase === 'clarifying' && showTakeoff) {
      // Drop the overlay so the user can see and answer the clarifying questions.
      // The clarifying-show effect above takes care of setShowQuestions(true).
      setShowTakeoff(false);
    }
    if (planner.state.phase === 'error' && showTakeoff) {
      setLoadingError(planner.state.message);
    }
  }, [planner.state.phase]);

  // When plan completes — save if logged in, otherwise store for preview
  useEffect(() => {
    if (planner.state.phase !== 'complete' || isSaving.current) return;
    isSaving.current = true;
    const plan = planner.state.plan;

    (async () => {
      if (!plan?.extracted) {
        setShowTakeoff(false);
        isSaving.current = false;
        router.push("/trips");
        return;
      }

      if (user) {
        // Logged in — save to Supabase via shared helper, then redirect
        try {
          const tripId = await savePlanToSupabase(plan as any);
          queryClient.invalidateQueries({ queryKey: ['trips'] });
          setTakeoffCompleted(true);
          await new Promise((r) => setTimeout(r, 800));
          setShowTakeoff(false);
          planner.reset();
          isSaving.current = false;
          router.push(`/trip/${tripId}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to save trip';
          setLoadingError(msg);
          isSaving.current = false;
        }
      } else {
        // Not logged in — store plan and show auth gate
        try { sessionStorage.setItem('pending-trip-plan', JSON.stringify(plan)); } catch {}
        setShowTakeoff(false);
        isSaving.current = false;
        setShowAuthGate(true);
      }
    })();
  }, [planner.state.phase]);

  const plannerStatusMessage = useMemo(() => {
    switch (planner.state.phase) {
      case 'extracting': return 'Understanding your trip...';
      case 'planning': return 'Building your perfect itinerary...';
      case 'complete': return 'Saving your trip...';
      default: return undefined;
    }
  }, [planner.state.phase]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] -mt-16">
      {/* ─── Hero Section ─────────────────────────────────────── */}
      <section ref={heroSectionRef} aria-label="Hero" className="relative flex items-center justify-center px-6 pt-36 pb-0 md:pt-44 md:pb-0 overflow-hidden min-h-screen bg-[#f2e6d8]">
        {/* Slideshow background */}
        <motion.div className="absolute top-0 left-0 right-0 -bottom-[150px] z-0 will-change-transform" style={{ scale: heroBgScale, y: heroBgY }}>
          {heroSlides.map((src, i) => (
            <img
              key={`hero-${i}`}
              src={src}
              alt=""
              width={1600}
              height={900}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              decoding={i === 0 ? "sync" : "async"}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
              style={{ opacity: heroSlide % heroSlides.length === i ? 1 : 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ))}
        </motion.div>
        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-black/30 to-black/50" />

        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center w-full will-change-[transform,opacity]"
          style={{ y: heroTextY, opacity: heroTextOpacity }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT_EXPO }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-white mb-4 leading-tight tracking-wide"
          >
            Plan your trip with AI.<br />
            <span className="italic">Plan it with friends.</span>
          </motion.h1>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: EASE_OUT_EXPO }}
            className="max-w-2xl mx-auto"
          >
            {/* Answered options summary */}
            {isClarifying && Object.keys(selectedAnswers).length > 0 && (
              <div className="mb-3 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-black/50 backdrop-blur-xl rounded-2xl px-5 py-2.5 border border-white/20 shadow-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white/80 truncate">
                      {Object.values(selectedAnswers).map((v) => v.join(", ")).join(" · ")}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {questions.map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                          style={{
                            background: i < currentQIdx ? "rgba(255,255,255,0.7)" : i === currentQIdx ? "white" : "rgba(255,255,255,0.2)",
                          }}
                        />
                      ))}
                      <button
                        onClick={handleConvReset}
                        className="ml-1.5 p-1 rounded-full hover:bg-white/15 text-white/50 hover:text-white/80 transition-colors"
                        title="Start over"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state while extracting */}
            {(isExtracting || isPlanning) && (
              <div className="mb-3 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-black/50 backdrop-blur-xl rounded-full px-6 py-3 border border-white/20 flex items-center justify-center gap-3 shadow-2xl">
                  <p className="text-white text-sm font-medium drop-shadow-sm">
                    {isExtracting ? "Understanding your trip..." : "Building your itinerary..."}
                  </p>
                  <div className="flex gap-1 shrink-0">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Validation error */}
            {validationError && (
              <div className="mb-3 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-amber-500/20 backdrop-blur-md rounded-full px-5 py-2.5 border border-amber-400/30 flex items-center justify-between gap-3 shadow-lg">
                  <p className="text-sm text-white">{validationError}</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {planner.state.phase === 'error' && (
              <div className="mb-3 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-red-500/20 backdrop-blur-md rounded-full px-5 py-2.5 border border-red-400/30 flex items-center justify-between gap-3 shadow-lg">
                  <p className="text-sm text-white">{planner.state.message}</p>
                  <button onClick={handleConvReset} className="text-white/70 hover:text-white text-xs font-medium">Try again</button>
                </div>
              </div>
            )}

            {/* Search bar — always visible, even during the clarifying flow so the
                user can refine their original prompt without losing context. */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center p-1.5 gap-2">
                <HeroSearchInput
                  tripQuery={tripQuery}
                  setTripQuery={setTripQuery}
                  onSearch={onSearch}
                  staticPlaceholder={heroConfig?.search_placeholder}
                  inputRef={inputRef}
                />
                <button
                  ref={searchButtonRef}
                  onClick={onSearch}
                  disabled={isExtracting || isPlanning}
                  aria-label="Generate trip"
                  className="bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shrink-0"
                >
                  <PaperPlane size={16} />
                </button>
              </div>
            </div>
          </motion.div>

            {/* Questions — only shown if user clicked Refine */}
            {isClarifying && showQuestions && currentQuestion && (
              <div className="mt-4 animate-[fadeSlideIn_0.3s_ease-out]">
                <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    {currentQIdx > 0 ? (
                      <button
                        onClick={() => setCurrentQIdx((i) => Math.max(0, i - 1))}
                        aria-label="Previous question"
                        className="w-6 h-6 -ml-1 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                      </button>
                    ) : (
                      <Sparkles size={14} className="text-white/60" />
                    )}
                    <p className="text-sm text-white font-semibold">{currentQuestion.question}</p>
                    <span className="ml-auto text-[10px] text-white/40 font-medium shrink-0">
                      {currentQIdx + 1}/{questions.length}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {currentQuestion.options.map((opt, i) => (
                      <OptionCard
                        key={opt}
                        label={opt}
                        index={i}
                        selected={(selectedAnswers[currentQuestion.id] ?? []).includes(opt)}
                        onSelect={() => handleOptionSelect(currentQuestion.id, opt)}
                      />
                    ))}
                  </div>
                  {/* Type your own answer */}
                  <form
                    className="mt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.target as HTMLFormElement).elements.namedItem('custom') as HTMLInputElement;
                      const val = input?.value?.trim();
                      if (val) {
                        handleOptionSelect(currentQuestion.id, val);
                        input.value = '';
                      }
                    }}
                  >
                    <input
                      name="custom"
                      type="text"
                      placeholder="Or type your own..."
                      aria-label="Or type your own answer"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                    />
                  </form>
                  {/* Plan it now — escape hatch */}
                  <button
                    onClick={() => {
                      setShowTakeoff(true);
                      planner.submitAnswers(flattenAnswers(selectedAnswers));
                    }}
                    className="w-full mt-3 text-[11px] text-white/40 hover:text-white/70 transition-colors py-1.5 text-center"
                  >
                    Done? Plan my trip with what I&apos;ve picked →
                  </button>
                </div>
              </div>
            )}

            {/* Suggestion Pills — only show when idle */}
            {planner.state.phase === 'idle' && CATEGORIES.some((c) => c.pills.length > 0) && (
              <div className="mt-4 animate-[fadeSlideIn_0.3s_ease-out] min-h-[76px]">
                  <div className="flex flex-col items-center gap-2">
                    {/* Category label */}
                    <span className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">
                      {currentCategory.label}
                    </span>
                    {/* Pills */}
                    <div className="flex justify-center gap-1.5 sm:gap-2">
                      <div
                        key={`${pillCategory}-${pillGroup}`}
                        className="flex justify-center gap-1.5 sm:gap-2 animate-[fadeSlideIn_0.4s_ease-out]"
                      >
                        {visiblePills.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              // Update search bar to show what's being searched
                              setTripQuery(s.label);
                              const promptForCategory = pillCategory === 0
                                ? `Plan a trip to ${s.label}`
                                : `Plan a ${s.label.toLowerCase()}`;
                              skipQuestionsRef.current = true;
                              skipRetryCountRef.current = 0;
                              planner.submitPrompt(promptForCategory);
                            }}
                            className="text-[10px] sm:text-xs text-white font-semibold border border-white/50 rounded-full px-2.5 sm:px-3.5 py-1 sm:py-1.5 hover:bg-white/30 transition-colors backdrop-blur-md bg-white/20 shadow-md drop-shadow-md whitespace-nowrap"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Live travel quote */}
                    {quote && (
                      <p
                        className="text-[12px] text-white/90 italic max-w-md text-center leading-relaxed mt-3"
                        style={{
                          textShadow: '0 1px 2px rgba(0,0,0,0.55), 0 0 8px rgba(0,0,0,0.35)',
                        }}
                      >
                        &ldquo;{quote.content}&rdquo;
                        <span className="not-italic text-white/70"> — {quote.author}</span>
                      </p>
                    )}
                  </div>
              </div>
            )}
          </motion.div>

      </section>

      {/* ─── Use Cases — warm sand ────────────────────────── */}
      <UseCases onPlanTrip={handlePlanTrip} />

      {/* ─── Stats — trust signals ────────────────────────── */}
      <PressStats />

      {/* ─── Press Marquee — As Seen In ──────────────────── */}



      {/* ─── Product Demo — existing, dark bg ─────────────── */}
      <ProductDemo />

      {/* ─── Testimonials — warm sand ─────────────────────── */}
      <Testimonials />

      {/* ─── Tag Us — social feed ─────────────────────────── */}
      <TagUs />

      {/* ─── Final CTA ────────────────────────────────────── */}
      <FinalCTA />

      {/* ─── Mobile Showcase ───────────────────────────────── */}
      <MobileShowcase />

      {/* ─── Footer ────────────────────────────────────────── */}
      <Footer />


      {/* ─── Takeoff Animation Overlay ─────────────────────────── */}
      <TakeoffTransition
        visible={showTakeoff}
        buttonRect={null}
        statusMessage={plannerStatusMessage}
        completed={takeoffCompleted}
        error={loadingError}
        onRetry={() => {
          setShowTakeoff(false);
          setLoadingError(null);
          setTakeoffCompleted(false);
          planner.reset();
          isSaving.current = false;
        }}
        onComplete={() => {}}
      />

      {/* ─── Auth gate for trip planning ─────────────────────────── */}
      {showAuthGate && (() => {
        const authGateId = "auth-gate-heading";
        return (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowAuthGate(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setShowAuthGate(false); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={authGateId}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={authGateId} className="text-2xl font-serif text-slate-900 dark:text-white mb-2">Sign in to plan your trip</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              We&apos;ll save your itinerary, hotels, and flights to your account so you can come back to it anytime.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/signup?next=/')}
                className="w-full rounded-xl bg-[#1e3a5f] hover:bg-[#16314f] text-white font-semibold py-3 transition-colors"
              >
                Create free account
              </button>
              <button
                onClick={() => router.push('/login?next=/')}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                I already have an account
              </button>
              <button
                onClick={() => setShowAuthGate(false)}
                className="text-xs text-slate-500 dark:text-slate-400 hover:underline mt-1"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      );
      })()}
    </div>
  );
}
