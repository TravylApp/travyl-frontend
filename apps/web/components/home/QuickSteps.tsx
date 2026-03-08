"use client";

import { motion } from "motion/react";
import { User, MapPin, Ticket, Share2 } from "lucide-react";
import { EASE_OUT_EXPO } from "@travyl/shared";

const STEPS = [
  {
    icon: User,
    title: "Sign Up",
    description: "Create your account and set up your travel preferences in minutes.",
  },
  {
    icon: MapPin,
    title: "Plan Your Trip",
    description: "Use our AI-powered tools to create your perfect itinerary.",
  },
  {
    icon: Ticket,
    title: "Book Everything",
    description: "Reserve flights, hotels, and activities all in one place.",
  },
  {
    icon: Share2,
    title: "Travel & Share",
    description: "Enjoy your trip and share your experiences with our community.",
  },
];

export function QuickSteps() {
  return (
    <section className="py-16 px-6 bg-[#1a2e4a]">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="text-2xl md:text-3xl font-bold text-white text-center mb-12"
        >
          How It Works
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: EASE_OUT_EXPO }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Icon size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
