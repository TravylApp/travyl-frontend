"use client";

import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence, type MotionValue } from "motion/react";
import { TypeWriter } from "@/components/TypeWriter";

const PARALLAX_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&fit=crop",
    quote: "The journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
  },
  {
    image: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1600&fit=crop",
    quote: "Travel makes one modest. You see what a tiny place you occupy in the world.",
    author: "Gustave Flaubert",
  },
  {
    image: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1600&fit=crop",
    quote: "Life is short and the world is wide.",
    author: null,
  },
  {
    image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1600&fit=crop",
    quote: "Adventure is worthwhile in itself.",
    author: "Amelia Earhart",
  },
];

export const ParallaxQuoteDivider = forwardRef<HTMLDivElement, { bgY: MotionValue<number> }>(
  function ParallaxQuoteDivider({ bgY }, ref) {
    const [slideIndex, setSlideIndex] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setSlideIndex((prev) => (prev + 1) % PARALLAX_SLIDES.length);
      }, 10000);
      return () => clearInterval(interval);
    }, []);

    return (
      <section ref={ref} className="relative h-[50vh] overflow-hidden">
        <motion.div className="absolute inset-[-20%]" style={{ y: bgY }}>
          {PARALLAX_SLIDES.map((slide, i) => (
            <img
              key={slide.image}
              src={slide.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: slideIndex === i ? 1 : 0 }}
            />
          ))}
        </motion.div>
        <div className="absolute inset-0 bg-[#1e3a5f]/30" />
        <div className="relative h-full flex items-center justify-center z-10 px-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={slideIndex}
              initial={{ opacity: 0, y: 15, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.97 }}
              transition={{ duration: 0.8 }}
              className="text-sm sm:text-base md:text-lg text-white font-light italic text-center w-fit max-w-[85%] md:max-w-xl px-4 py-1.5 md:px-6 md:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/40 shadow-sm drop-shadow-sm"
            >
              &ldquo;<TypeWriter key={slideIndex} text={PARALLAX_SLIDES[slideIndex].quote} delay={300} speed={35} />&rdquo;
              {PARALLAX_SLIDES[slideIndex].author && (
                <span className="text-white/60 not-italic"> — {PARALLAX_SLIDES[slideIndex].author}</span>
              )}
            </motion.p>
          </AnimatePresence>
        </div>
      </section>
    );
  }
);
