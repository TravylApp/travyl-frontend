"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Check, ArrowRight, MessageSquare, Sparkles, CircleCheck } from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "@travyl/shared";

const STEP_ICONS = [MessageSquare, Sparkles, CircleCheck];
const AUTO_ADVANCE_MS = 5000;

interface HowItWorksProps {
  onCtaPress?: () => void;
}

export function HowItWorks({ onCtaPress }: HowItWorksProps) {
  const [activeStep, setActiveStep] = useState(0);
  const stepCount = HOW_IT_WORKS_STEPS.length;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    setActiveStep((prev) => (prev + 1) % stepCount);
  }, [stepCount]);

  // Auto-advance on a simple timeout — no interval, no state-driven progress
  useEffect(() => {
    timeoutRef.current = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [activeStep, advance]);

  const handleStepClick = (i: number) => {
    setActiveStep(i);
  };

  return (
    <section className="py-16 px-6">
      {/* CSS keyframe for progress bar — runs entirely on GPU */}
      <style>{`
        @keyframes hiw-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl text-black mb-2">
            <span className="font-extrabold">How</span>{" "}
            <span className="font-normal italic">It Works</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            From destination to departure — your perfect trip in 3 simple steps.
          </p>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-start">
          {HOW_IT_WORKS_STEPS.map((step, i) => {
            const StepIcon = STEP_ICONS[i];
            const isActive = activeStep === i;
            const isCompleted = activeStep > i;

            return (
              <motion.button
                key={i}
                onClick={() => handleStepClick(i)}
                className={`relative text-left rounded-xl sm:rounded-2xl p-3 sm:p-5 transition-all duration-300 cursor-pointer overflow-hidden md:min-h-[240px] ${
                  isActive
                    ? "bg-white text-gray-900 shadow-lg shadow-gray-200 scale-[1.02] border border-gray-100"
                    : isCompleted
                      ? "bg-[#1e3a5f]/5 text-foreground hover:bg-[#1e3a5f]/10"
                      : "bg-gray-50 text-foreground hover:bg-gray-100"
                }`}
                initial={false}
                animate={{ y: isActive ? -2 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Progress bar — pure CSS animation, no React re-renders */}
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gray-300 rounded-t-2xl overflow-hidden">
                    <div
                      key={activeStep}
                      className="h-full bg-[#B8860B] rounded-full origin-left"
                      style={{
                        animation: `hiw-progress ${AUTO_ADVANCE_MS}ms linear forwards`,
                      }}
                    />
                  </div>
                )}

                {/* Step number + icon row */}
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                    isActive
                      ? "bg-[#B8860B]/20 text-[#B8860B]"
                      : isCompleted
                        ? "bg-[#1e3a5f] text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}>
                    {isCompleted ? <Check size={12} /> : i + 1}
                  </div>
                  <StepIcon
                    size={14}
                    className={`hidden sm:block ${isActive ? "text-gray-400" : "text-gray-300"}`}
                  />
                </div>

                {/* Title */}
                <h3 className={`text-[11px] sm:text-sm font-bold mb-1 sm:mb-1.5 leading-snug ${
                  isActive ? "text-black" : ""
                }`}>
                  {step.title}
                </h3>

                {/* Description — fade only */}
                <div
                  className="transition-opacity duration-300 ease-out hidden sm:block"
                  style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? "auto" : "none" }}
                >
                  <p className="text-gray-600 text-xs leading-relaxed mb-3">
                    {step.description}
                  </p>
                  <ul className="space-y-1.5">
                    {step.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-[11px] text-gray-700"
                      >
                        <Check size={12} className="text-[#B8860B] shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <button
            onClick={onCtaPress}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-full font-semibold text-sm hover:bg-[#162d4a] transition-colors"
          >
            Plan Your Trip <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
