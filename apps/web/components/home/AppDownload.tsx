"use client";

import Image from "next/image";
import { motion, useInView } from "motion/react";
import { useRef, useEffect, useState } from "react";
import { EASE_OUT_EXPO } from "@travyl/shared";
import { Apple, MapPin, Calendar, Heart, Search, User } from "lucide-react";

// Scrollable content items for the phone screen
const scrollItems = [
  { type: "header", title: "Paris, France", subtitle: "7 days • 2 travelers" },
  { type: "image", url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=200&fit=crop" },
  { type: "card", title: "Eiffel Tower", meta: "Day 1 • Morning", icon: "landmark" },
  { type: "card", title: "Louvre Museum", meta: "Day 1 • Afternoon", icon: "museum" },
  { type: "card", title: "Seine River Cruise", meta: "Day 2 • Evening", icon: "boat" },
  { type: "image", url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=200&fit=crop" },
  { type: "card", title: "Montmartre", meta: "Day 3 • Morning", icon: "building" },
  { type: "card", title: "Notre-Dame", meta: "Day 3 • Afternoon", icon: "church" },
];

export function AppDownload() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const duration = 8000;
    const maxScroll = 200;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % duration;

      const progress = elapsed / duration;
      const easeInOut = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setScrollY(easeInOut * maxScroll);
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isInView]);

  return (
    <section className="relative w-full py-20 md:py-28 overflow-hidden">
      {/* Background Image */}
      <Image
        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&fit=crop"
        alt=""
        fill
        sizes="100vw"
        className="object-cover z-0"
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 z-0 bg-black/40" />

      <div ref={containerRef} className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Left Column - Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
            className="text-left"
          >
            <p className="text-sm uppercase tracking-wider text-white/70 mb-3 font-medium">
              Travyl for iOS
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 uppercase leading-tight">
              Take us on your next adventure!
            </h2>
            <p className="text-base sm:text-lg text-white/80 mb-8 max-w-md">
              Download the free Travyl app — your ultimate travel companion.
            </p>

            {/* Download Options */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-3 bg-white text-black px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors"
              >
                <Apple size={24} />
                <div className="text-left">
                  <div className="text-[10px] text-gray-500 leading-none">Download on the</div>
                  <div className="text-base font-semibold leading-tight">App Store</div>
                </div>
              </a>

              <span className="text-white/60 text-sm hidden sm:block">or</span>

              <div className="flex flex-col items-center">
                <div className="bg-white p-2 rounded-lg">
                  <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs text-center p-1">
                    QR Code
                  </div>
                </div>
                <span className="text-white/60 text-xs mt-2">Scan to download</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Phone with Hand */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASE_OUT_EXPO }}
            className="hidden md:flex justify-center items-end relative"
          >
            {/* Tilted Phone + Hand Container */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
              style={{ transform: "rotate(-12deg)", transformOrigin: "bottom center" }}
            >
              {/* Hand Silhouette */}
              <svg
                viewBox="0 0 200 320"
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-64 h-auto z-10"
              >
                <path
                  d="M100 300 C60 280, 40 240, 45 200 L50 160 C52 140, 60 130, 70 130 C80 130, 85 140, 85 155 L85 180 L90 120 C92 100, 100 95, 108 100 C116 105, 118 115, 116 135 L112 180 L120 110 C122 90, 130 85, 138 90 C146 95, 148 105, 146 125 L142 180 L150 130 C152 115, 158 112, 165 118 C172 124, 172 135, 170 150 L165 190 C160 220, 140 260, 100 300"
                  fill="#1a1a1a"
                  stroke="none"
                />
              </svg>

              {/* Phone Frame */}
              <div className="relative z-20">
                <div className="relative w-56 h-[460px] bg-black rounded-[2.5rem] p-1.5 shadow-2xl">
                  {/* Screen */}
                  <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                    {/* Dynamic Island */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-30" />

                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-white z-20 relative">
                      <span className="text-[10px] font-semibold">9:41</span>
                      <div className="flex items-center gap-0.5">
                        <div className="w-3 h-1.5 bg-black rounded-sm" />
                        <div className="w-4 h-2 bg-black rounded-sm" />
                      </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-hidden h-[calc(100%-28px)] relative">
                      <motion.div
                        animate={{ y: -scrollY }}
                        transition={{ type: "tween", ease: "linear", duration: 0.1 }}
                        className="px-3 pt-2"
                      >
                        {/* Header */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-gray-900">Travyl</span>
                            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                          </div>
                          <h3 className="text-base font-bold text-gray-900">{scrollItems[0].title}</h3>
                          <p className="text-[10px] text-gray-500">{scrollItems[0].subtitle}</p>
                        </div>

                        {/* Image */}
                        <div className="mb-3 rounded-xl overflow-hidden relative h-24">
                          <Image
                            src={scrollItems[1].url || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=200&fit=crop"}
                            alt=""
                            fill
                            sizes="224px"
                            className="object-cover"
                          />
                        </div>

                        {/* Itinerary Cards */}
                        {scrollItems.slice(2).map((item, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-xl p-2.5 mb-2 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
                              <p className="text-[10px] text-gray-500">{item.meta}</p>
                            </div>
                          </div>
                        ))}

                        {/* Duplicate for seamless loop */}
                        <div className="mb-3 rounded-xl overflow-hidden">
                          <img src={scrollItems[1].url} alt="" className="w-full h-24 object-cover" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Bottom Navigation */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex justify-around z-20">
                      <div className="flex flex-col items-center">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="text-[8px] text-gray-400 mt-0.5">Search</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-[8px] text-blue-600 mt-0.5">Trips</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Heart className="w-4 h-4 text-gray-400" />
                        <span className="text-[8px] text-gray-400 mt-0.5">Saved</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-[8px] text-gray-400 mt-0.5">Profile</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
