"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface CollectedPreferences {
  duration?: string;
  travelers?: string;
  interests?: string[];
  budget?: string;
  pace?: string;
}

interface PreferenceCarouselProps {
  tripTitle: string;
  tripTagline: string;
  location: string;
  image: string;
  onSubmit: (prefs: CollectedPreferences) => void;
}

const STEPS = [
  {
    id: "preview",
    question: null,
    options: null,
    multi: false,
  },
  {
    id: "duration",
    question: "How long?",
    options: ["3 days", "5 days", "7 days", "14 days"],
    multi: false,
  },
  {
    id: "travelers",
    question: "Who's coming?",
    options: ["Just me", "Couple", "Family", "Friends"],
    multi: false,
  },
  {
    id: "interests",
    question: "Interests?",
    options: ["Food", "Adventure", "Culture", "Nature", "Nightlife", "Shopping", "Wellness"],
    multi: true,
  },
  {
    id: "budget",
    question: "Budget?",
    options: ["Budget-friendly", "Moderate", "Luxury", "No preference"],
    multi: false,
  },
  {
    id: "pace",
    question: "Pace?",
    options: ["Relaxed", "Moderate", "Packed it in"],
    multi: false,
  },
];

export function PreferenceCarousel({
  tripTitle,
  tripTagline,
  location,
  image,
  onSubmit,
}: PreferenceCarouselProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [prefs, setPrefs] = useState<CollectedPreferences>({});
  const [submitting, setSubmitting] = useState(false);

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isPreview = step === 0;

  const submitRef = useRef(submitting);
  submitRef.current = submitting;

  const handleSelect = useCallback(
    (value: string) => {
      const id = current.id as keyof CollectedPreferences;
      if (current.multi) {
        // Derive from updater to avoid stale closure on rapid multi-toggles
        setPrefs((p) => {
          const currentVals = (p[id] as string[]) ?? [];
          const updated = currentVals.includes(value)
            ? currentVals.filter((v) => v !== value)
            : [...currentVals, value];
          return { ...p, [id]: updated };
        });
      } else {
        setPrefs((p) => ({ ...p, [id]: value }));
        // Single-select auto-advances after a brief pause
        setTimeout(() => {
          setDirection(1);
          setStep((s) => Math.min(s + 1, STEPS.length - 1));
        }, 300);
      }
    },
    [current.id, current.multi]
  );

  const handleSkip = useCallback(() => {
    if (!isLastStep) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [isLastStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onSubmit(prefs);
    } else {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [isLastStep, prefs, onSubmit]);

  const handleSubmit = useCallback(() => {
    if (submitRef.current) return; // Debounce: prevent double submission
    setSubmitting(true);
    onSubmit(prefs);
  }, [prefs, onSubmit]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  // Build summary text for the final step
  const summaryParts: string[] = [];
  if (prefs.duration) summaryParts.push(prefs.duration);
  if (prefs.travelers) summaryParts.push(prefs.travelers);
  if (prefs.interests?.length) summaryParts.push(`interested in ${prefs.interests.join(", ").toLowerCase()}`);
  if (prefs.budget) summaryParts.push(prefs.budget.toLowerCase());
  if (prefs.pace) summaryParts.push(prefs.pace.toLowerCase());

  return (
    <div className="flex flex-col h-full">
      {/* Hero image for preview step */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col"
        >
          {isPreview ? (
            /* Step 0: Destination Preview — full hero image */
            <div className="relative w-full flex-1 min-h-[200px]">
              <img
                src={image}
                alt={location}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-2xl font-serif font-normal text-white tracking-wide">
                  {location}
                </h2>
                <p className="text-base font-medium text-white/90 mt-1">
                  {tripTitle}
                </p>
                <p className="text-sm text-white/60 mt-0.5">{tripTagline}</p>
              </div>
            </div>
          ) : (
            /* Steps 1-5: Preference questions */
            <div className="flex-1 px-5 pt-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                  Step {step} of {STEPS.length - 1}
                </p>
                <button
                  onClick={handleSkip}
                  className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {current.question}
              </h3>

              <div className="flex flex-wrap gap-2">
                {(current.options ?? []).map((opt) => {
                  const id = current.id as keyof CollectedPreferences;
                  const isSelected = current.multi
                    ? ((prefs[id] as string[]) ?? []).includes(opt)
                    : prefs[id] === opt;

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(opt)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isSelected
                          ? "bg-[#1e3a5f] text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 py-3 shrink-0">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? "w-6 bg-[#1e3a5f]"
                : i < step
                ? "w-1.5 bg-[#1e3a5f]/40"
                : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* CTA area */}
      <div className="px-5 pb-5 shrink-0">
        {isPreview ? (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:brightness-125 transition-all"
          >
            Let's plan this
          </button>
        ) : isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:brightness-125 disabled:opacity-50 transition-all"
          >
            Plan my trip to {location}
            {summaryParts.length > 0 && (
              <span className="block text-xs text-white/70 font-normal mt-0.5">
                {summaryParts.join(" · ")}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
