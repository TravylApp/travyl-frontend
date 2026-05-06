"use client";

import { useState, useEffect, forwardRef, useMemo } from "react";
import { motion, AnimatePresence, type MotionValue } from "motion/react";
import { TypeWriter } from "@/components/TypeWriter";
import { usePlaceImages } from "@travyl/shared";

// Curated travel quotes — expanded pool for variety
const QUOTES = [
  { quote: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { quote: "Travel makes one modest. You see what a tiny place you occupy in the world.", author: "Gustave Flaubert" },
  { quote: "Life is short and the world is wide.", author: null },
  { quote: "Adventure is worthwhile in itself.", author: "Amelia Earhart" },
  { quote: "Not all those who wander are lost.", author: "J.R.R. Tolkien" },
  { quote: "To travel is to live.", author: "Hans Christian Andersen" },
  { quote: "The world is a book, and those who do not travel read only a page.", author: "Saint Augustine" },
  { quote: "Travel far enough, you meet yourself.", author: "David Mitchell" },
  { quote: "Once a year, go someplace you've never been before.", author: "Dalai Lama" },
  { quote: "Travel is the only thing you buy that makes you richer.", author: null },
  { quote: "We travel not to escape life, but for life not to escape us.", author: null },
  { quote: "A good traveler has no fixed plans and is not intent on arriving.", author: "Lao Tzu" },
  { quote: "Take only memories, leave only footprints.", author: "Chief Seattle" },
  { quote: "Jobs fill your pocket, but adventures fill your soul.", author: "Jaime Lyn Beatty" },
  { quote: "The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.", author: "Marcel Proust" },
  { quote: "Wherever you go, go with all your heart.", author: "Confucius" },
];

// Fallback images — only used if trending + API images both fail
const FALLBACK_IMAGES = [
  "https://images.pexels.com/photos/29213215/pexels-photo-29213215.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/34600662/pexels-photo-34600662.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/35134885/pexels-photo-35134885.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/37297741/pexels-photo-37297741.jpeg?auto=compress&cs=tinysrgb&w=1400",
];

// Daily seed — same for server and client on the same day
function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(((seed * 2654435761 + i * 1597334677) >>> 0) / 4294967296 * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface TrendingDestination {
  name: string;
  country: string;
  thumbnail: string | null;
}

interface Props {
  bgY: MotionValue<number>;
  trendingDestinations?: TrendingDestination[];
}

export const ParallaxQuoteDivider = forwardRef<HTMLDivElement, Props>(
  function ParallaxQuoteDivider({ bgY, trendingDestinations }, ref) {
    const [slideIndex, setSlideIndex] = useState(0);

    // Pick 4 trending destination names for high-res image lookups
    const imageSearchNames = useMemo(() => {
      if (!trendingDestinations?.length) return [];
      const seed = dailySeed();
      return seededShuffle(trendingDestinations, seed + 2)
        .slice(0, 4)
        .map((d) => `${d.name} ${d.country} landmark`);
    }, [trendingDestinations]);

    // Fetch high-res images via /api/images (same as hero/HowItWorks)
    const imageQueries = usePlaceImages(imageSearchNames);

    const slides = useMemo(() => {
      const seed = dailySeed();
      const shuffledQuotes = seededShuffle(QUOTES, seed);

      // Build image list: prefer API images, then fallbacks
      const apiImages = imageQueries
        .map((q) => q.data?.url)
        .filter((url): url is string => !!url);

      const images = apiImages.length >= 4
        ? apiImages
        : [...apiImages, ...FALLBACK_IMAGES].slice(0, 4);

      return shuffledQuotes.slice(0, 4).map((q, i) => ({
        image: images[i % images.length],
        ...q,
      }));
    }, [imageQueries]);

    useEffect(() => {
      const interval = setInterval(() => {
        setSlideIndex((prev) => (prev + 1) % slides.length);
      }, 10000);
      return () => clearInterval(interval);
    }, [slides.length]);

    return (
      <section ref={ref} className="relative h-[40vh] overflow-hidden">
        <motion.div className="absolute inset-[-20%]" style={{ y: bgY }}>
          {slides.map((slide, i) => (
            <img
              key={slide.image}
              src={slide.image}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: slideIndex === i ? 1 : 0 }}
            />
          ))}
        </motion.div>
        <div className="absolute inset-0 bg-[#0f1f33]/50" />
        <div className="relative h-full flex items-center justify-center z-10 px-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={slideIndex}
              initial={{ opacity: 0, y: 15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.97 }}
              transition={{ duration: 0.8 }}
              className="text-sm sm:text-base md:text-lg text-white font-light italic text-center max-w-[85%] md:max-w-xl drop-shadow-md"
            >
              &ldquo;<TypeWriter key={slideIndex} text={slides[slideIndex].quote} delay={300} speed={35} />&rdquo;
              {slides[slideIndex].author && (
                <span className="text-white/60 not-italic"> — {slides[slideIndex].author}</span>
              )}
            </motion.p>
          </AnimatePresence>
        </div>
      </section>
    );
  }
);
