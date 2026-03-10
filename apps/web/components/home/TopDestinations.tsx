"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { EASE_OUT_EXPO } from "@travyl/shared";

const topCities = [
  { name: "Paris", href: "/explore/paris" },
  { name: "Tokyo", href: "/explore/tokyo" },
  { name: "New York", href: "/explore/new-york" },
  { name: "London", href: "/explore/london" },
  { name: "Barcelona", href: "/explore/barcelona" },
  { name: "Rome", href: "/explore/rome" },
  { name: "Dubai", href: "/explore/dubai" },
  { name: "Sydney", href: "/explore/sydney" },
];

const topCountries = [
  { name: "France", href: "/explore/france" },
  { name: "Japan", href: "/explore/japan" },
  { name: "Italy", href: "/explore/italy" },
  { name: "Spain", href: "/explore/spain" },
  { name: "Thailand", href: "/explore/thailand" },
  { name: "Greece", href: "/explore/greece" },
  { name: "Australia", href: "/explore/australia" },
  { name: "Mexico", href: "/explore/mexico" },
];

const topExperiences = [
  { name: "Beach Getaways", href: "/explore?category=beach" },
  { name: "City Breaks", href: "/explore?category=city" },
  { name: "Mountain Retreats", href: "/explore?category=mountain" },
  { name: "Cultural Tours", href: "/explore?category=cultural" },
  { name: "Adventure Trips", href: "/explore?category=adventure" },
  { name: "Romantic Escapes", href: "/explore?category=romantic" },
  { name: "Family Vacations", href: "/explore?category=family" },
  { name: "Food & Wine", href: "/explore?category=food" },
];

export function TopDestinations() {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="text-2xl md:text-3xl font-bold text-[#1e3a5f] mb-2"
        >
          Adventure anywhere
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT_EXPO }}
          className="text-gray-500 mb-8"
        >
          Explore trending destinations around the world
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Top Cities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT_EXPO }}
          >
            <h3 className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wider mb-4">
              Top 8 cities
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {topCities.map((city) => (
                <Link
                  key={city.name}
                  href={city.href}
                  className="text-sm text-gray-600 hover:text-[#1e3a5f] transition-colors py-1.5 hover:translate-x-0.5 transform transition-transform"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Top Countries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT_EXPO }}
          >
            <h3 className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wider mb-4">
              Top 8 countries
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {topCountries.map((country) => (
                <Link
                  key={country.name}
                  href={country.href}
                  className="text-sm text-gray-600 hover:text-[#1e3a5f] transition-colors py-1.5 hover:translate-x-0.5 transform transition-transform"
                >
                  {country.name}
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Top Experiences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE_OUT_EXPO }}
          >
            <h3 className="text-xs font-semibold text-[#F59E0B] uppercase tracking-wider mb-4">
              Top experiences
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {topExperiences.map((exp) => (
                <Link
                  key={exp.name}
                  href={exp.href}
                  className="text-sm text-gray-600 hover:text-[#1e3a5f] transition-colors py-1.5 hover:translate-x-0.5 transform transition-transform"
                >
                  {exp.name}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
