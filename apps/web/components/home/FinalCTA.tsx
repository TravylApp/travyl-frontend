"use client";

import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="bg-[#1e3a5f] text-white py-20 sm:py-28 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal tracking-wide leading-tight mb-4">
          Your next trip starts here.
        </h2>
        <p className="text-sm sm:text-base text-white/70 mb-8 max-w-xl mx-auto">
          Tell Travyl where you want to go and we&apos;ll plan the rest. Hotels, flights, restaurants, and a day-by-day itinerary in seconds.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1e3a5f] rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          Start planning
        </Link>
      </div>
    </section>
  );
}

export default FinalCTA;
