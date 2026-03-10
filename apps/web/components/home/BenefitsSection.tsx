"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Clock, Leaf, ArrowRight } from "lucide-react";
import { EASE_OUT_EXPO } from "@travyl/shared";

const benefits = [
  {
    number: "01",
    title: "Lightning Fast",
    shortTitle: "Fast",
    description: "Get a complete personalized itinerary in seconds, not hours. Our AI processes millions of data points to craft your perfect trip instantly.",
    icon: Zap,
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&fit=crop",
    stats: [
      { value: "< 30s", label: "To generate itinerary" },
      { value: "10x", label: "Faster than manual planning" },
    ],
  },
  {
    number: "02",
    title: "Always Available",
    shortTitle: "24/7",
    description: "Plan your trip anytime, anywhere. No waiting for travel agents or business hours. Your AI travel companion never sleeps.",
    icon: Clock,
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&fit=crop",
    stats: [
      { value: "24/7", label: "Availability" },
      { value: "0", label: "Wait time" },
    ],
  },
  {
    number: "03",
    title: "Eco-Conscious",
    shortTitle: "Green",
    description: "We prioritize sustainable travel options and highlight eco-friendly accommodations, restaurants, and activities in every itinerary.",
    icon: Leaf,
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&fit=crop",
    stats: [
      { value: "100%", label: "Carbon offset options" },
      { value: "500+", label: "Eco-certified partners" },
    ],
  },
];

export function BenefitsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeBenefit = benefits[activeIndex]!;

  return (
    <section className="py-20 px-6 bg-[#1e3a5f]">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-sm font-semibold text-[#F59E0B] uppercase tracking-wider text-center mb-3"
        >
          Benefits
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-4xl font-bold text-white text-center mb-12"
        >
          Why travelers love us
        </motion.h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: Tab navigation */}
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <motion.button
                key={benefit.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setActiveIndex(index)}
                className={`w-full text-left p-5 rounded-xl transition-all duration-300 ${
                  activeIndex === index
                    ? "bg-white/10 backdrop-blur-sm"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Number */}
                  <span
                    className={`text-xl font-black transition-colors ${
                      activeIndex === index ? "text-[#F59E0B]" : "text-white/30"
                    }`}
                  >
                    {benefit.number}
                  </span>

                  {/* Content */}
                  <div className="flex-1">
                    <h3
                      className={`text-base font-bold mb-1 transition-colors ${
                        activeIndex === index ? "text-white" : "text-white/70"
                      }`}
                    >
                      {benefit.title}
                    </h3>
                    <AnimatePresence mode="wait">
                      {activeIndex === index && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="text-sm text-white/70 leading-relaxed">
                            {benefit.description}
                          </p>

                          {/* Stats */}
                          <div className="flex gap-6 mt-4">
                            {benefit.stats.map((stat) => (
                              <div key={stat.label}>
                                <div className="text-lg font-bold text-[#F59E0B]">
                                  {stat.value}
                                </div>
                                <div className="text-xs text-white/50">
                                  {stat.label}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                      activeIndex === index
                        ? "bg-[#F59E0B] text-white"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    <benefit.icon size={18} />
                  </div>
                </div>
              </motion.button>
            ))}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="pt-4"
            >
              <button className="group inline-flex items-center gap-2 px-6 py-3 bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:shadow-[#F59E0B]/25">
                Learn more
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>

          {/* Right: Image display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="relative h-[380px] lg:h-[460px] rounded-2xl overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeBenefit.image}
                  alt={activeBenefit.title}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a5f]/60 via-transparent to-transparent" />

                {/* Floating badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                      <activeBenefit.icon size={22} className="text-[#F59E0B]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#1e3a5f]">
                        {activeBenefit.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {activeBenefit.shortTitle} planning
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
