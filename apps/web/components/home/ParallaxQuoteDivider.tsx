"use client";

import { useState, useEffect, forwardRef, useMemo, useRef } from "react";
import { motion, type MotionValue } from "motion/react";
import { usePlaceImages } from "@travyl/shared";

const SLIDE_DESTINATIONS = ["Swiss Alps", "Bali Rice Terraces", "Sahara Desert", "Norwegian Fjords"];

const QUOTES = [
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Travel makes one modest. You see what a tiny place you occupy in the world.", author: "Gustave Flaubert" },
  { text: "Life is short and the world is wide.", author: null },
  { text: "Adventure is worthwhile in itself.", author: "Amelia Earhart" },
];

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&fit=crop&fm=webp&q=80",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1600&fit=crop&fm=webp&q=80",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1600&fit=crop&fm=webp&q=80",
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1600&fit=crop&fm=webp&q=80",
];

// Typewriter via direct DOM — zero re-renders
function useQuoteTyper(text: string, speed = 35) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    el.textContent = "";
    let i = 0;
    const tick = () => {
      if (!el || i > text.length) return;
      el.textContent = "\u201C" + text.slice(0, i) + "\u201D";
      i++;
      if (i <= text.length) setTimeout(tick, speed);
    };
    const delay = setTimeout(tick, 400);
    return () => { clearTimeout(delay); };
  }, [text, speed]);

  return spanRef;
}

export const ParallaxQuoteDivider = forwardRef<HTMLDivElement, { bgY: MotionValue<number> }>(
  function ParallaxQuoteDivider({ bgY }, ref) {
    const [slideIndex, setSlideIndex] = useState(0);
    const imageQueries = usePlaceImages(SLIDE_DESTINATIONS);

    const slideImages = useMemo(
      () => SLIDE_DESTINATIONS.map((_, i) => imageQueries[i]?.data?.url || FALLBACK_IMAGES[i]),
      [imageQueries]
    );

    useEffect(() => {
      const interval = setInterval(() => {
        setSlideIndex((prev) => (prev + 1) % QUOTES.length);
      }, 12000);
      return () => clearInterval(interval);
    }, []);

    const quote = QUOTES[slideIndex];
    const quoteRef = useQuoteTyper(quote.text);

    return (
      <section ref={ref} className="relative h-[50vh] overflow-hidden">
        <motion.div className="absolute inset-[-20%]" style={{ y: bgY }}>
          {slideImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              width={1600}
              height={900}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: slideIndex === i ? 1 : 0 }}
            />
          ))}
        </motion.div>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative h-full flex items-center justify-center z-10 px-6">
          <div className="text-center max-w-[85%] md:max-w-2xl">
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-medium italic drop-shadow-lg">
              <span ref={quoteRef} />
              <span className="animate-pulse ml-0.5 not-italic text-white/50">|</span>
            </p>
            {quote.author && (
              <p
                key={slideIndex}
                className="text-white/60 text-sm mt-3 not-italic font-medium animate-[fadeIn_0.8s_ease-out_2s_both]"
              >
                — {quote.author}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }
);
