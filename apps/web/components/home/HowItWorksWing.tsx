"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "motion/react";
import { Player } from "@remotion/player";
import { ArrowRight } from "lucide-react";
import { EASE_OUT_EXPO } from "@travyl/shared";
import { DescribeTripVideo } from "@/remotion/DescribeTripVideo";
import { GetPlanVideo } from "@/remotion/GetPlanVideo";
import { BookGoVideo } from "@/remotion/BookGoVideo";

const steps = [
  {
    number: "01",
    title: "Describe your trip",
    description: "Tell us where you want to go, how long you'll stay, and who's coming along.",
    component: DescribeTripVideo,
  },
  {
    number: "02",
    title: "Get your plan",
    description: "Our AI crafts a personalized itinerary with activities, restaurants, and hidden gems.",
    component: GetPlanVideo,
  },
  {
    number: "03",
    title: "Book and go",
    description: "Reserve hotels, flights, and activities in one tap. Then enjoy your adventure!",
    component: BookGoVideo,
  },
];

// Wrapper to play animation only when in view
function AnimatedPlayer({ component }: { component: React.FC }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.5 });
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (isInView && !shouldPlay) {
      setShouldPlay(true);
    }
  }, [isInView, shouldPlay]);

  return (
    <div ref={ref}>
      <Player
        component={component}
        durationInFrames={90}
        compositionWidth={280}
        compositionHeight={280}
        fps={30}
        style={{
          width: 220,
          height: 220,
          borderRadius: 16,
          overflow: "hidden",
        }}
        loop
        moveToBeginningWhenEnded={false}
        autoPlay={shouldPlay}
        controls={false}
      />
    </div>
  );
}

export function HowItWorksWing() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
          className="text-sm font-semibold text-[#F59E0B] uppercase tracking-wider text-center mb-3"
        >
          How it works
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-4xl font-bold text-[#1e3a5f] text-center mb-4"
        >
          Your trip, simplified
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-gray-500 text-center max-w-2xl mx-auto mb-16"
        >
          Plan your perfect getaway in three simple steps
        </motion.p>

        {/* Steps with Remotion Players */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: index * 0.2, ease: EASE_OUT_EXPO }}
              className="flex flex-col items-center text-center"
            >
              {/* Number badge */}
              <div className="text-6xl font-black text-[#F59E0B]/15 mb-4">
                {step.number}
              </div>

              {/* Remotion Player container with frame */}
              <div className="relative mb-8">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/10 to-transparent rounded-3xl blur-xl scale-110" />

                {/* Player frame */}
                <div className="relative bg-white rounded-3xl p-4 shadow-xl shadow-gray-200/50 border border-gray-100">
                  <AnimatedPlayer component={step.component} />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[260px]">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-16"
        >
          <button className="group inline-flex items-center gap-2 px-8 py-3.5 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:shadow-[#F59E0B]/25">
            Start planning
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
