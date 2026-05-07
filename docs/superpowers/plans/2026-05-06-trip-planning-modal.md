# Trip Planning Modal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead "Plan this trip" buttons on UseCases cards with a responsive modal/drawer that collects optional preferences via a carousel micro-step flow, then submits a rich prompt to the existing AI trip planner.

**Architecture:** Three new components (`PlanTripModal`, `ModalShell`, `PreferenceCarousel`) + refactored `UseCases` + integration in `page.tsx`. The homepage owns `useTripPlanner()` and passes an `onPlanTrip` callback down; the modal collects preferences, builds a prompt, and calls the callback to trigger the existing takeoff→extract→plan→save→redirect flow.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, motion/react (Framer Motion v12), TypeScript, lucide-react icons

**Spec:** `docs/superpowers/specs/2026-05-06-trip-planning-modal-design.md`

---

## Chunk 1: TRIP_CASES Data + UseCases Refactor

### Task 1.1: Extend TRIP_CASES with context data

**Files:**
- Modify: `apps/web/components/home/UseCases.tsx:8-33`

- [ ] **Step 1: Add `context` field to each TRIP_CASES entry**

```ts
const TRIP_CASES = [
  {
    title: "Solo adventure",
    tagline: "Your pace, your rules",
    prompt: "Plan a solo trip",
    image:
      "https://images.pexels.com/photos/1624436/pexels-photo-1624436.jpeg?auto=compress&cs=tinysrgb&w=800&fit=crop",
    location: "Swiss Alps",
    context: { city: "Interlaken", country: "Switzerland" },
  },
  {
    title: "Group getaway",
    tagline: "Shared moments, zero stress",
    prompt: "Plan a group trip",
    image:
      "https://images.pexels.com/photos/2409681/pexels-photo-2409681.jpeg?auto=compress&cs=tinysrgb&w=800&fit=crop",
    location: "Ibiza, Spain",
    context: { city: "Ibiza", country: "Spain" },
  },
  {
    title: "Family vacation",
    tagline: "Memories to last a lifetime",
    prompt: "Plan a family vacation",
    image:
      "https://images.pexels.com/photos/1128316/pexels-photo-1128316.jpeg?auto=compress&cs=tinysrgb&w=800&fit=crop",
    location: "Maui, Hawaii",
    context: { city: "Maui", country: "United States" },
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/home/UseCases.tsx
git commit -m "feat: add context field to TRIP_CASES for structured location data"
```

### Task 1.2: Refactor UseCases to accept onPlanTrip and remove planner/router

**Files:**
- Modify: `apps/web/components/home/UseCases.tsx:1-6`, `:35-42`, `:68-69`

- [ ] **Step 1: Update imports — remove `useRouter` and `useTripPlanner`, add `useState`**

Change from:
```tsx
"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { EASE_OUT_EXPO, useTripPlanner } from "@travyl/shared";
```

To:
```tsx
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { EASE_OUT_EXPO } from "@travyl/shared";
```

- [ ] **Step 2: Add `onPlanTrip` prop and modal state**

Change the component declaration from:
```tsx
export function UseCases() {
  const router = useRouter();
  const planner = useTripPlanner();

  const handleCase = (prompt: string) => {
    planner.submitPrompt(prompt);
    router.push("/");
  };
```

To:
```tsx
interface UseCasesProps {
  onPlanTrip: (prompt: string, context: { city?: string; country?: string }) => void;
}

export function UseCases({ onPlanTrip }: UseCasesProps) {
  const [selectedCase, setSelectedCase] = useState<(typeof TRIP_CASES)[number] | null>(null);

  const handleOpenModal = (tripCase: (typeof TRIP_CASES)[number]) => {
    setSelectedCase(tripCase);
  };
```

- [ ] **Step 3: Update card onClick to pass the whole case object**

Change:
```tsx
onClick={() => handleCase(c.prompt)}
onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCase(c.prompt); } }}
```

To:
```tsx
onClick={() => handleOpenModal(c)}
onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleOpenModal(c); } }}
```

- [ ] **Step 4: Add PlanTripModal import and render it**

At the top of the file, add:
```tsx
import { PlanTripModal } from "./PlanTripModal";
```

At the bottom of the return JSX (after the closing `</div>` and `</section>`):
```tsx
{selectedCase && (
  <PlanTripModal
    open={!!selectedCase}
    onClose={() => setSelectedCase(null)}
    tripCase={selectedCase}
    onPlan={onPlanTrip}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/home/UseCases.tsx
git commit -m "refactor: UseCases accepts onPlanTrip prop, opens modal on card click"
```

---

## Chunk 2: ModalShell — Responsive Modal/Bottom Sheet

### Task 2.1: Create ModalShell component

**Files:**
- Create: `apps/web/components/home/ModalShell.tsx`

- [ ] **Step 1: Write ModalShell component**

```tsx
"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function ModalShell({ open, onClose, children }: ModalShellProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Desktop: centered modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden sm:flex flex-col bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <button
              aria-label="Close"
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <X size={15} />
            </button>
            {children}
          </motion.div>

          {/* Mobile: bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative sm:hidden flex flex-col bg-white rounded-t-2xl w-full max-h-[85vh] overflow-hidden shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1 shrink-0">
              <div className="w-8 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Close button */}
            <button
              aria-label="Close"
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
            >
              <X size={15} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/home/ModalShell.tsx
git commit -m "feat: add responsive ModalShell — centered modal on desktop, bottom sheet on mobile"
```

---

## Chunk 3: PreferenceCarousel — Micro-Step Flow

### Task 3.1: Create PreferenceCarousel component

**Files:**
- Create: `apps/web/components/home/PreferenceCarousel.tsx`

- [ ] **Step 1: Write PreferenceCarousel component**

```tsx
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
```

Notes:
- `isPreview` renders the hero image full-bleed
- Steps 1-5 render option chips
- Single-select auto-advances after 300ms; multi-select stays until user taps Next
- Skip link always visible on non-preview steps
- Progress dots: active = navy wide dot, completed = navy small dot, future = gray dot
- Final CTA shows a summary line of selected preferences

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/home/PreferenceCarousel.tsx
git commit -m "feat: add PreferenceCarousel with micro-step flow for trip preferences"
```

---

## Chunk 4: PlanTripModal — Orchestrator

### Task 4.1: Create PlanTripModal compositing ModalShell + PreferenceCarousel

**Files:**
- Create: `apps/web/components/home/PlanTripModal.tsx`

- [ ] **Step 1: Write PlanTripModal component**

```tsx
"use client";

import { ModalShell } from "./ModalShell";
import { PreferenceCarousel } from "./PreferenceCarousel";

interface PlanTripModalProps {
  open: boolean;
  onClose: () => void;
  tripCase: {
    title: string;
    tagline: string;
    prompt: string;
    image: string;
    location: string;
    context: { city: string; country: string };
  };
  onPlan: (prompt: string, context: { city?: string; country?: string }) => void;
}

export function PlanTripModal({
  open,
  onClose,
  tripCase,
  onPlan,
}: PlanTripModalProps) {
  const buildPrompt = (prefs: {
    duration?: string;
    travelers?: string;
    interests?: string[];
    budget?: string;
    pace?: string;
  }) => {
    const parts: string[] = [tripCase.prompt];
    if (tripCase.location) parts.push(`to ${tripCase.location}`);
    if (prefs.duration) parts.push(prefs.duration);
    if (prefs.travelers) parts.push(prefs.travelers);
    if (prefs.interests?.length)
      parts.push(`interested in ${prefs.interests.join(", ").toLowerCase()}`);
    if (prefs.budget) parts.push(prefs.budget.toLowerCase());
    if (prefs.pace) parts.push(prefs.pace.toLowerCase());
    return parts.join(", ");
  };

  const handleSubmit = (prefs: Record<string, any>) => {
    const prompt = buildPrompt(prefs);
    onPlan(prompt, tripCase.context);
    onClose();
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <PreferenceCarousel
        tripTitle={tripCase.title}
        tripTagline={tripCase.tagline}
        location={tripCase.location}
        image={tripCase.image}
        onSubmit={handleSubmit}
      />
    </ModalShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/home/PlanTripModal.tsx
git commit -m "feat: add PlanTripModal — orchestrates ModalShell + PreferenceCarousel"
```

---

## Chunk 5: Homepage Integration

### Task 5.1: Update page.tsx to pass onPlanTrip to UseCases

**Files:**
- Modify: `apps/web/app/(main)/page.tsx:252-275, 962-963`

- [ ] **Step 1: Define the onPlanTrip callback in the Home component**

In the Home component body (after `const planner = useTripPlanner();` at line 269), add:

```tsx
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
```

- [ ] **Step 2: Update the UseCases usage to pass onPlanTrip**

Change:
```tsx
<UseCases />
```

To:
```tsx
<UseCases onPlanTrip={handlePlanTrip} />
```

- [ ] **Step 3: Add the import for useCallback if not already present**

Verify that `useCallback` is imported at the top of the file (line 3). The import should already include it:
```tsx
import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(main\)/page.tsx
git commit -m "feat: integrate UseCases onPlanTrip callback with homepage planner"
```

---

## Chunk 6: Verification

### Task 6.1: Typecheck and lint

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors. If errors appear, fix them.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No lint errors. If errors appear, fix them.

- [ ] **Step 3: Final commit with any fixes**

```bash
git add -A
git commit -m "chore: fix type/lint issues after trip planning modal implementation"
```

### Task 6.2: Manual smoke test checklist

- [ ] **Test 1:** Load the homepage, scroll to the UseCases section. Verify all 3 cards render with "Plan this trip" text.
- [ ] **Test 2:** Click "Plan this trip" on the Solo adventure card. Verify the modal opens (desktop: centered, mobile: bottom sheet).
- [ ] **Test 3:** Verify the Destination Preview step shows the hero image, location name, trip title, and tagline.
- [ ] **Test 4:** Tap "Let's plan this" → advance to Step 1 (Duration). Verify chips appear and Skip link is visible.
- [ ] **Test 5:** Select a duration chip → verify it highlights navy, then auto-advances to Step 2.
- [ ] **Test 6:** Skip through all remaining steps without selecting anything → verify "Plan my trip" button shows location but no summary line.
- [ ] **Test 7:** Re-open, select a few preferences → verify summary shows on the final CTA.
- [ ] **Test 8:** Submit the plan → verify the modal closes and the takeoff animation plays.
- [ ] **Test 9:** Close the modal mid-flow via X / Escape / backdrop click → verify it closes cleanly with no side effects.
