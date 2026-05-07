"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative py-28 sm:py-36 px-6 overflow-hidden bg-[#0f1a28]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 25px 25px, white 1px, transparent 0)`,
        backgroundSize: '50px 50px',
      }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1a28] via-transparent to-[#0f1a28]" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-white leading-tight tracking-wide">
          Ready to plan your{" "}
          <span className="italic text-[#c4a882]">next adventure</span>?
        </h2>
        <p className="text-sm sm:text-base text-white/60 mt-4 max-w-lg mx-auto leading-relaxed">
          Stop juggling spreadsheets and browser tabs. Travyl brings everything
          together — from inspiration to itinerary — in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-[#0f1a28] text-sm font-semibold hover:bg-[#c4a882] hover:text-white transition-all duration-300 shadow-lg shadow-black/20"
          >
            Start planning free
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
