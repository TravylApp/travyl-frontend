"use client";

const STATS = [
  { value: "10k+",   label: "Trips planned"  },
  { value: "190+",   label: "Countries covered" },
  { value: "4.9★",   label: "Average rating" },
  { value: "< 30s",  label: "From idea to itinerary" },
];

export function PressStats() {
  return (
    <section className="py-16 sm:py-20 px-6 bg-[#f5f1eb]">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {STATS.map(({ value, label }) => (
          <div key={label}>
            <p className="text-3xl sm:text-4xl font-serif font-normal text-[#1e3a5f] mb-1">{value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PressStats;
