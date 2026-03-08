"use client";

import { motion } from "motion/react";
import { Check, ArrowRight } from "lucide-react";
import { HOW_IT_WORKS_STEPS, EASE_OUT_EXPO } from "@travyl/shared";
import { PhoneFrame } from "./PhoneFrame";
import { WebSearchScreen, WebItineraryScreen, WebBookedScreen } from "./screens";

const STEP_COLORS = ["#1e3a5f", "#1e3a5f", "#1e3a5f"];

interface HowItWorksProps {
  onCtaPress?: () => void;
}

export function HowItWorks({ onCtaPress }: HowItWorksProps) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-3">
          How It Works
        </h2>
        <p className="text-muted-foreground text-center mb-14 max-w-2xl mx-auto">
          From destination to departure — your perfect trip in 3 simple steps.
        </p>

        <div className="space-y-20">
          {HOW_IT_WORKS_STEPS.map((step, i) => {
            const isEven = i % 2 === 1;
            const accent = STEP_COLORS[i] ?? "#003594";

            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: EASE_OUT_EXPO }}
                className={`flex flex-col md:flex-row items-center gap-10 ${
                  isEven ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Text side */}
                <div className="flex-1 space-y-4">
                  <span
                    className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: accent }}
                  >
                    Step {step.step}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  <ul className="space-y-2 pt-2">
                    {step.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <Check size={16} style={{ color: accent }} className="shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Phone mockup */}
                <div className="flex-1 flex justify-center">
                  <PhoneFrame delay={i * 0.15} accent={accent}>
                    {i === 0 && <WebSearchScreen />}
                    {i === 1 && <WebItineraryScreen />}
                    {i === 2 && <WebBookedScreen />}
                  </PhoneFrame>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        {onCtaPress && (
          <div className="text-center mt-14">
            <button
              onClick={onCtaPress}
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Start planning your trip
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
