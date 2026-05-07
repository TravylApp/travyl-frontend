"use client";

const PRESS = ["TechCrunch", "Wired", "Condé Nast Traveler", "The Verge", "Skift", "Bloomberg"];

export function PressMarquee() {
  return (
    <section className="py-12 px-6 border-y border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 text-center mb-6">As featured in</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {PRESS.map((name) => (
            <span key={name} className="text-sm font-serif text-gray-400 hover:text-gray-600 transition-colors">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PressMarquee;
