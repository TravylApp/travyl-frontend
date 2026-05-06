"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { Star, ChevronDown, User } from "lucide-react";
import { EASE_OUT_EXPO } from "@travyl/shared";

interface Testimonial {
  name: string;
  location: string;
  snippet: string;
  quote: string;
  rating: number;
  avatarImg: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Alex Chen",
    location: "San Francisco, CA",
    snippet: "\"The real-time collaboration saved us from the endless 'can you add this to the spreadsheet' back-and-forth.\"",
    quote: "We planned a 2-week Japan trip with 4 friends using Travyl. The real-time collaboration saved us from the endless 'can you add this to the spreadsheet' back-and-forth. Everyone could add their must-visit spots and we had a final itinerary in 20 minutes.",
    rating: 5,
    avatarImg: 1,
  },
  {
    name: "Sarah Mitchell",
    location: "London, UK",
    snippet: "\"I typed '3 days in Rome with good pasta and art' and it built a complete itinerary.\"",
    quote: "I've tried every trip planner out there. Travyl is the first one that actually understands natural language. I typed '3 days in Rome with good pasta and art' and it built a complete itinerary. The AI suggestions were surprisingly spot-on.",
    rating: 5,
    avatarImg: 5,
  },
  {
    name: "Marcus Johnson",
    location: "New York, NY",
    snippet: "\"Planning a family vacation with kids is usually chaos. Travyl's day-by-day calendar made it so simple.\"",
    quote: "Planning a family vacation with kids is usually chaos. Travyl's day-by-day calendar made it so simple — we could see the pacing at a glance and adjust activities that would be too much for the kids. Game changer for family trips.",
    rating: 5,
    avatarImg: 12,
  },
  {
    name: "Priya Patel",
    location: "Toronto, Canada",
    snippet: "\"I mainly travel solo and Travyl is perfect for that. I just tell it what I'm looking for and get a solid plan.\"",
    quote: "I mainly travel solo and Travyl is perfect for that. I don't need a group — I just tell it what I'm looking for and get a solid plan. The budget tracking helps me keep costs in check without doing math in my head.",
    rating: 4,
    avatarImg: 25,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= count ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ t, i, carousel }: { t: Testimonial; i: number; carousel?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const children = (
    <>
      <Stars count={t.rating} />
      <div className="mt-3 mb-5">
        {!expanded ? (
          <p className="text-sm text-magazine-text leading-relaxed italic">
            {t.snippet}
          </p>
        ) : (
          <p className="text-sm text-magazine-text leading-relaxed">
            &ldquo;{t.quote}&rdquo;
          </p>
        )}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-magazine-accent hover:text-[#a07e2e] dark:hover:text-magazine-accent/80 transition-colors"
        >
          {expanded ? "Show less" : "Read the full story"}
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <div className="flex items-center gap-3">
        {avatarError ? (
          <div className="w-10 h-10 rounded-full shrink-0 ring-2 ring-white dark:ring-[var(--magazine-surface)] bg-[#1e3a5f] flex items-center justify-center">
            <User size={14} className="text-white/70" />
          </div>
        ) : (
          <img
            src={`https://i.pravatar.cc/80?img=${t.avatarImg}`}
            alt={t.name}
            loading="lazy"
            onError={() => setAvatarError(true)}
            className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white dark:ring-[var(--magazine-surface)]"
          />
        )}
        <div>
          <p className="text-sm font-semibold text-magazine-heading">{t.name}</p>
          <p className="text-xs text-magazine-text">{t.location}</p>
        </div>
      </div>
    </>
  );

  if (carousel) {
    return (
      <div className="group rounded-2xl bg-white/70 dark:bg-magazine-surface/80 backdrop-blur-sm border border-[#c4a882]/30 dark:border-white/[0.08] p-6 sm:p-8 hover:bg-white/90 dark:hover:bg-magazine-surface hover:shadow-lg hover:shadow-[#c4a882]/10 dark:hover:shadow-black/20 transition-all duration-300">
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: i * 0.08, ease: EASE_OUT_EXPO }}
      className="group rounded-2xl bg-white/70 dark:bg-magazine-surface/80 backdrop-blur-sm border border-[#c4a882]/30 dark:border-white/[0.08] p-6 sm:p-8 hover:bg-white/90 dark:hover:bg-magazine-surface hover:shadow-lg hover:shadow-[#c4a882]/10 dark:hover:shadow-black/20 transition-all duration-300"
    >
      {children}
    </motion.div>
  );
}

export function Testimonials() {
  return (
    <section className="py-20 sm:py-28 px-6 bg-sand-base">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-magazine-accent">
            Loved by Travelers
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal mt-2 leading-tight text-magazine-heading tracking-wide">
            Real travelers, <span className="italic">real results</span>
          </h2>
          <p className="text-sm text-magazine-text mt-2 max-w-lg mx-auto leading-relaxed">
            Here&apos;s what people are saying about planning with Travyl.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name} t={t} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
