"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EASE_OUT_EXPO } from "@travyl/shared";
import Link from "next/link";

const categories = [
  { id: "beach", label: "Beach", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop" },
  { id: "city", label: "City Break", image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=300&fit=crop" },
  { id: "mountain", label: "Mountain", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop" },
  { id: "cultural", label: "Cultural", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=300&fit=crop" },
  { id: "adventure", label: "Adventure", image: "https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=400&h=300&fit=crop" },
  { id: "romantic", label: "Romantic", image: "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=400&h=300&fit=crop" },
  { id: "family", label: "Family", image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=300&fit=crop" },
  { id: "food", label: "Food & Wine", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop" },
  { id: "wildlife", label: "Wildlife", image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&h=300&fit=crop" },
  { id: "wellness", label: "Wellness", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop" },
  { id: "roadtrip", label: "Road Trip", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop" },
  { id: "backpacking", label: "Backpacking", image: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=300&fit=crop" },
];

export function BrowseByCategory() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="py-16 px-6 bg-[#FAFBFC]">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="text-2xl md:text-3xl font-bold text-[#1e3a5f] mb-2"
        >
          Browse by category
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT_EXPO }}
          className="text-gray-500 mb-6"
        >
          Find your perfect adventure type
        </motion.p>

        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Scroll buttons - only visible on hover */}
          <button
            onClick={() => scroll("left")}
            className={`absolute top-1/2 left-0 z-10 w-10 h-10 -translate-y-1/2 bg-white/95 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out ${isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"} hover:scale-110 hover:shadow-xl active:scale-95`}
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} className="text-[#1e3a5f]" strokeWidth={2.5} />
          </button>
          <button
            onClick={() => scroll("right")}
            className={`absolute top-1/2 right-0 z-10 w-10 h-10 -translate-y-1/2 bg-white/95 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out ${isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"} hover:scale-110 hover:shadow-xl active:scale-95`}
            aria-label="Scroll right"
          >
            <ChevronRight size={18} className="text-[#1e3a5f]" strokeWidth={2.5} />
          </button>

          {/* Scrollable container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide px-2 py-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: EASE_OUT_EXPO }}
              >
                <Link
                  href={`/explore?category=${category.id}`}
                  className="group flex flex-col items-center min-w-[130px] md:min-w-[150px]"
                >
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-2 ring-1 ring-gray-100 group-hover:ring-[#F59E0B]/50 transition-all">
                    <img
                      src={category.image}
                      alt={category.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent group-hover:from-black/20 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#1e3a5f] transition-colors">
                    {category.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
