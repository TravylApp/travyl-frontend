"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface CollectedPreferences {
  destination?: string;
  duration?: string;
  travelers?: string;
  interests?: string[];
  budget?: string;
  pace?: string;
}

const OTHER_KEY = "__other__";

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
    id: "destination",
    question: "Where to?",
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

const TOTAL_QUESTION_STEPS = STEPS.length - 1; // exclude preview

export function PreferenceCarousel({
  tripTitle,
  tripTagline,
  location,
  image,
  onSubmit,
}: PreferenceCarouselProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [prefs, setPrefs] = useState<CollectedPreferences>({ destination: location });
  const [submitting, setSubmitting] = useState(false);
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [showCustom, setShowCustom] = useState<Record<string, boolean>>({});

  const destInputRef = useRef<HTMLInputElement>(null);

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isPreview = step === 0;
  const isDestination = current.id === "destination";

  const submitRef = useRef(submitting);
  submitRef.current = submitting;

  // Auto-focus the destination input when the step is shown
  useEffect(() => {
    if (isDestination && destInputRef.current) {
      destInputRef.current.focus();
    }
  }, [isDestination]);

  const handleSelect = useCallback(
    (value: string) => {
      const id = current.id as keyof CollectedPreferences;
      if (value === OTHER_KEY) {
        setShowCustom((s) => ({ ...s, [id]: true }));
        return;
      }
      // Dismiss custom input when a normal option is tapped
      setShowCustom((s) => ({ ...s, [id]: false }));
      if (current.multi) {
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

  const handleCustomTextChange = useCallback(
    (id: string, text: string) => {
      setCustomText((c) => ({ ...c, [id]: text }));
    },
    []
  );

  const handleConfirmCustom = useCallback(() => {
    const id = current.id as keyof CollectedPreferences;
    const text = customText[id]?.trim();
    if (!text) return;
    if (current.multi) {
      setPrefs((p) => {
        const currentVals = (p[id] as string[]) ?? [];
        if (currentVals.includes(text)) return p;
        return { ...p, [id]: [...currentVals, text] };
      });
      setCustomText((c) => ({ ...c, [id]: "" }));
    } else {
      setPrefs((p) => ({ ...p, [id]: text }));
      setShowCustom((s) => ({ ...s, [id]: false }));
      setTimeout(() => {
        setDirection(1);
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
      }, 300);
    }
  }, [current.id, current.multi, customText]);

  const handleCustomKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleConfirmCustom();
      }
    },
    [handleConfirmCustom]
  );

  const handleSkip = useCallback(() => {
    if (!isLastStep) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [isLastStep]);

  const resolvePrefs = useCallback((): CollectedPreferences => {
    // Merge any pending custom text into prefs for the current step
    const resolved: Record<string, unknown> = { ...prefs };
    const id = current.id;
    if (showCustom[id] && customText[id]?.trim()) {
      const text = customText[id].trim();
      if (current.multi) {
        const arr = ((resolved[id] as string[] | undefined) ?? []).slice();
        if (!arr.includes(text)) {
          arr.push(text);
        }
        resolved[id] = arr;
      } else {
        resolved[id] = text;
      }
    }
    return resolved as CollectedPreferences;
  }, [prefs, current.id, current.multi, showCustom, customText]);

  const handleNext = useCallback(() => {
    const updated = resolvePrefs();
    if (isLastStep) {
      onSubmit(updated);
    } else {
      // Persist any custom value into state before advancing
      const id = current.id as keyof CollectedPreferences;
      if (showCustom[id] && customText[id]?.trim()) {
        setPrefs(updated);
        setShowCustom((s) => ({ ...s, [id]: false }));
      }
      setDirection(1);
      setStep((s) => s + 1);
    }
  }, [isLastStep, resolvePrefs, onSubmit, current.id, current.multi, showCustom, customText]);

  const handleSubmit = useCallback(() => {
    if (submitRef.current) return; // Debounce: prevent double submission
    setSubmitting(true);
    const updated = resolvePrefs();
    onSubmit(updated);
  }, [resolvePrefs, onSubmit]);

  const handleDestKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && prefs.destination?.trim()) {
        setDirection(1);
        setStep((s) => s + 1);
      }
    },
    [prefs.destination]
  );

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  // Build summary text for the final step
  const summaryParts: string[] = [];
  if (prefs.destination) summaryParts.push(`to ${prefs.destination}`);
  if (prefs.duration) summaryParts.push(prefs.duration);
  if (prefs.travelers) summaryParts.push(prefs.travelers);
  if (prefs.interests?.length) summaryParts.push(`interested in ${prefs.interests.join(", ").toLowerCase()}`);
  if (prefs.budget) summaryParts.push(prefs.budget.toLowerCase());
  if (prefs.pace) summaryParts.push(prefs.pace.toLowerCase());

  return (
    <div className="flex flex-col h-full">
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
          ) : isDestination ? (
            /* Step 1: Destination — prominent text input */
            <div className="flex-1 px-5 pt-6 pb-4 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400 text-center mb-2">
                  Step 1 of {TOTAL_QUESTION_STEPS}
                </p>
                <h3 className="text-xl font-semibold text-gray-900 text-center mb-6">
                  Where do you want to go?
                </h3>
                <div className="relative">
                  <input
                    ref={destInputRef}
                    type="text"
                    value={prefs.destination ?? ""}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, destination: e.target.value }))
                    }
                    onKeyDown={handleDestKeyDown}
                    placeholder="e.g. Tokyo, Paris, Costa Rica..."
                    className="w-full px-5 py-4 rounded-xl text-base border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all placeholder:text-gray-400"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Steps 2-6: Preference questions */
            <div className="flex-1 px-5 pt-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                  Step {step} of {TOTAL_QUESTION_STEPS}
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

                {/* "Other" option button */}
                {current.options && (
                  <button
                    onClick={() => handleSelect(OTHER_KEY)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      showCustom[current.id]
                        ? "bg-[#1e3a5f] text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
                    }`}
                  >
                    Other
                  </button>
                )}

                {/* Custom text input for "Other" */}
                {showCustom[current.id] && (
                  <div className="w-full mt-2 flex gap-2">
                    <input
                      type="text"
                      value={customText[current.id] ?? ""}
                      onChange={(e) =>
                        handleCustomTextChange(current.id, e.target.value)
                      }
                      onKeyDown={handleCustomKeyDown}
                      placeholder={
                        current.multi
                          ? "Type a custom interest..."
                          : "Type your answer..."
                      }
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-white text-gray-900 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-all placeholder:text-gray-400"
                      autoFocus
                    />
                    {current.multi && (
                      <button
                        onClick={handleConfirmCustom}
                        disabled={!customText[current.id]?.trim()}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[#1e3a5f] text-white hover:brightness-125 disabled:opacity-40 transition-all shrink-0"
                      >
                        Add
                      </button>
                    )}
                  </div>
                )}
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
            Let&apos;s plan this
          </button>
        ) : isDestination ? (
          <button
            onClick={() => {
              if (prefs.destination?.trim()) {
                setDirection(1);
                setStep((s) => s + 1);
              }
            }}
            disabled={!prefs.destination?.trim()}
            className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:brightness-125 disabled:opacity-40 transition-all"
          >
            Continue
          </button>
        ) : isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:brightness-125 disabled:opacity-50 transition-all"
          >
            Plan my trip to {prefs.destination || location}
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
