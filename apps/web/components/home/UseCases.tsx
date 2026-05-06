"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { EASE_OUT_EXPO, useTripPlanner } from "@travyl/shared";

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

export function UseCases() {
  const router = useRouter();
  const planner = useTripPlanner();

  const handleCase = (prompt: string) => {
    planner.submitPrompt(prompt);
    router.push("/");
  };

  return (
    <section className="py-20 sm:py-28 px-6 bg-sand-base">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-magazine-accent">
            Curated For You
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal mt-2 leading-tight text-magazine-heading tracking-wide">
            Trips for every travel style
          </h2>
          <p className="text-sm text-magazine-text mt-2 max-w-lg mx-auto leading-relaxed">
            Pick a vibe and let Travyl build the rest.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TRIP_CASES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: EASE_OUT_EXPO }}
              className="group relative aspect-[3/2] md:aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer"
              onClick={() => handleCase(c.prompt)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCase(c.prompt); } }}
              role="button"
              tabIndex={0}
              aria-label={`Plan a ${c.title.toLowerCase()} trip`}
            >
              {/* Background image */}
              <img
                src={c.image}
                alt={c.location}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />

              {/* Gradient overlay — darker at bottom for text */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1d30] via-[#0f1d30]/10 to-transparent" />

              {/* Content — bottom anchored */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <h3 className="text-xl sm:text-2xl font-serif font-normal text-white tracking-wide">
                  {c.title}
                </h3>
                <p className="text-sm text-white/70 mt-1 mb-4">
                  {c.tagline}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                  Plan this trip
                  <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
                {/* Photo credit — bottom left */}
                <p className="text-[9px] text-white/35 mt-6 sm:mt-8 tracking-wide">
                  {c.location}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
