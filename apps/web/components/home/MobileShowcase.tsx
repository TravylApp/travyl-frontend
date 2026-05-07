"use client";

import { Apple, Smartphone } from "lucide-react";

export function MobileShowcase() {
  return (
    <section className="py-20 sm:py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 mb-3">Travyl mobile</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-gray-900 tracking-tight leading-tight mb-4">
            Take Travyl with you.
          </h2>
          <p className="text-base text-gray-600 leading-relaxed mb-8 max-w-md">
            Plan on the train, swipe through hotels at the airport, and check tomorrow&apos;s itinerary the second you land. Your trip stays in sync across every device.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-5 h-12 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#16314f] transition-colors">
              <Apple size={18} />
              App Store
            </button>
            <button className="flex items-center gap-2 px-5 h-12 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 transition-colors">
              <Smartphone size={18} />
              Google Play
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="w-[280px] aspect-[9/19] rounded-[2.5rem] border-[10px] border-gray-900 bg-gradient-to-br from-[#1e3a5f] to-[#0e7490] shadow-2xl flex items-center justify-center">
            <p className="text-white/70 text-sm font-medium">App preview</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MobileShowcase;
