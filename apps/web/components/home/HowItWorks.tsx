"use client";

import { useRef, useMemo } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
// motion.div used for progress bar; useTransform for progressX
import { useState } from "react";
import { ArrowRight, Check, MessageSquare, Sparkles, CircleCheck } from "lucide-react";
import { HOW_IT_WORKS_STEPS, usePlaceImages } from "@travyl/shared";

const STEP_ICONS = [MessageSquare, Sparkles, CircleCheck];
const STEP_IMAGES = ["Amalfi Coast Italy", "Rome Colosseum", "Bali beach resort"];
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1200&fit=crop&fm=webp&q=80",
  "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&fit=crop&fm=webp&q=80",
  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&fit=crop&fm=webp&q=80",
];

interface HowItWorksProps {
  onCtaPress?: () => void;
}

export function HowItWorks({ onCtaPress }: HowItWorksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const stepCount = HOW_IT_WORKS_STEPS.length;
  const prevStepRef = useRef(0);

  const imageQueries = usePlaceImages(STEP_IMAGES);
  const images = useMemo(
    () => STEP_IMAGES.map((_, i) => imageQueries[i]?.data?.url || FALLBACK_IMAGES[i]),
    [imageQueries]
  );

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  // Update active step based on scroll progress — no snapping, just natural scroll
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    let step = 0;
    if (v > 0.66) step = 2;
    else if (v > 0.33) step = 1;
    if (step !== prevStepRef.current) {
      prevStepRef.current = step;
      setActiveStep(step);
    }
  });

  // Images now also transition via activeStep (matching text behavior)

  // Progress bar
  const progressX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section className="py-16 px-6">
      {/* Header — outside the scroll container so it scrolls away */}
      <div className="max-w-6xl mx-auto text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-serif font-normal text-foreground mb-2 tracking-wide">
          How <span className="italic">It Works</span>
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          From destination to departure — your perfect trip in 3 simple steps.
        </p>
      </div>

      {/* Scroll container — the card sticks while you scroll through */}
      <div ref={containerRef} className="max-w-6xl mx-auto" style={{ height: `${stepCount * 45}vh` }}>
        <div className="sticky top-[15vh]">
          <div className="rounded-3xl overflow-hidden bg-[#0f1f33] shadow-2xl shadow-black/20">
            <div className="flex flex-col md:flex-row" style={{ minHeight: 420 }}>
              {/* Left — text */}
              <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
                {/* Step pills */}
                <div className="flex items-center gap-2 mb-8">
                  {HOW_IT_WORKS_STEPS.map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                          activeStep === i
                            ? "bg-white text-[#0f1f33] shadow-md shadow-white/15"
                            : activeStep > i
                              ? "bg-white/15 text-white"
                              : "bg-white/8 text-white/40"
                        }`}
                      >
                        {activeStep > i ? <Check size={14} strokeWidth={2.5} /> : i + 1}
                      </div>
                      {i < stepCount - 1 && (
                        <div className="w-6 h-[2px] rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-white/40 origin-left transition-transform duration-500"
                            style={{ transform: `scaleX(${activeStep > i ? 1 : 0})` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Animated content — CSS transition driven by activeStep */}
                <div className="relative min-h-[220px]">
                  {HOW_IT_WORKS_STEPS.map((step, i) => {
                    const Icon = STEP_ICONS[i];
                    const isActive = activeStep === i;
                    return (
                      <div
                        key={i}
                        className="absolute top-0 left-0 right-0 transition-all duration-500 ease-out"
                        style={{
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? "translateY(0)" : activeStep > i ? "translateY(-12px)" : "translateY(12px)",
                          pointerEvents: isActive ? "auto" : "none",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Icon size={14} className="text-white/40" />
                          <span className="text-white/30 text-[10px] font-medium uppercase tracking-widest">
                            Step {step.step}
                          </span>
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-black text-white mb-3 leading-tight">
                          {step.title}
                        </h3>

                        <p className="text-white/45 text-sm leading-relaxed mb-6 max-w-sm">
                          {step.description}
                        </p>

                        <ul className="space-y-2.5">
                          {step.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2.5 text-sm text-white/60">
                              <div className="w-[18px] h-[18px] rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <Check size={10} className="text-white/70" />
                              </div>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                <div className="mt-6">
                  <button
                    onClick={onCtaPress}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#0f1f33] rounded-full font-bold text-sm hover:bg-white/90 transition-colors"
                  >
                    Plan Your Trip <ArrowRight size={15} />
                  </button>
                </div>

                {/* Scroll progress bar */}
                <div className="mt-6 h-[2px] rounded-full bg-white/8 overflow-hidden">
                  <motion.div
                    className="h-full bg-white/25 origin-left rounded-full"
                    style={{ scaleX: progressX }}
                  />
                </div>

                {/* Scroll mouse indicator */}
                <div
                  className="mt-5 flex items-center gap-2 transition-opacity duration-300"
                  style={{ opacity: activeStep < stepCount - 1 ? 0.4 : 0 }}
                >
                  <div className="w-5 h-8 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
                    <div className="w-1 h-1.5 rounded-full bg-white/60 animate-[scrollDot_1.5s_ease-in-out_infinite]" />
                  </div>
                  <span className="text-white/30 text-[10px] font-medium uppercase tracking-wider">Scroll to explore</span>
                </div>
              </div>

              {/* Right — image */}
              <div className="relative w-full md:w-[45%] min-h-[280px] md:min-h-0 p-3 md:p-4">
                <div className="relative w-full h-full rounded-2xl overflow-hidden">
                  {images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out"
                      style={{
                        opacity: activeStep === i ? 1 : 0,
                        transform: activeStep === i ? "scale(1)" : "scale(1.04)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <style>{`@keyframes scrollDot { 0%, 100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(10px); opacity: 0.3; } }`}</style>
      </div>
    </section>
  );
}
