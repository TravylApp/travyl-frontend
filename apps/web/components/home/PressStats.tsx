"use client";

const STATS = [
  { value: "10k+",   label: "Trips planned"  },
  { value: "190+",   label: "Countries covered" },
  { value: "4.9★",   label: "Average rating" },
  { value: "< 30s",  label: "From idea to itinerary" },
];

export function PressStats() {
  return (
    <section className="py-16 sm:py-20 px-6 bg-[#ede5db] dark:bg-magazine-surface">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {STATS.map(({ value, label }) => (
          <div key={label}>
            <p className="text-3xl sm:text-4xl font-serif font-normal text-[#2a1f17] dark:text-magazine-heading mb-1">{value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5c4a3a]/60 dark:text-magazine-text/60">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PressStats;
