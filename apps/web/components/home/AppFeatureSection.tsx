"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, useInView } from "motion/react";
import { EASE_OUT_EXPO } from "@travyl/shared";
import { Apple, MapPin, Calendar, Heart, Search, User, ChevronLeft, ChevronRight } from "lucide-react";

const scrollItems = [
  { type: "header", title: "Paris, France", subtitle: "7 days • 2 travelers" },
  { type: "image", url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=200&fit=crop" },
  { type: "card", title: "Eiffel Tower", meta: "Day 1 • Morning", icon: "landmark" },
  { type: "card", title: "Louvre Museum", meta: "Day 1 • Afternoon", icon: "museum" },
  { type: "card", title: "Seine River Cruise", meta: "Day 2 • Evening", icon: "boat" },
];

const features = [
  { id: "search", label: "Search & discover", description: "Find your perfect destination with AI-powered recommendations" },
  { id: "plan", label: "Plan & book", description: "Create detailed itineraries and book everything in one place" },
  { id: "remember", label: "Remember & inspire", description: "Save your favorite trips and share with the community" },
];

export function AppFeatureSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const [scrollY, setScrollY] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

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

  // Auto-cycle features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full py-20 md:py-24 overflow-hidden bg-white">
      <div ref={containerRef} className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Phone */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
            className="flex justify-center"
          >
            {/* Phone Frame */}
            <div className="relative w-52 h-[420px] bg-black rounded-[2.5rem] p-1.5 shadow-2xl">
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
                        <span className="font-bold text-sm text-[#1e3a5f]">Travyl</span>
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
                        <div className="w-8 h-8 bg-[#F59E0B]/20 rounded-lg flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-[#F59E0B]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
                          <p className="text-[10px] text-gray-500">{item.meta}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </div>

                {/* Bottom Navigation */}
                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex justify-around z-20">
                  <div className="flex flex-col items-center">
                    <Search className="w-4 h-4 text-gray-400" />
                    <span className="text-[8px] text-gray-400 mt-0.5">Search</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Calendar className="w-4 h-4 text-[#F59E0B]" />
                    <span className="text-[8px] text-[#F59E0B] mt-0.5">Trips</span>
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
          </motion.div>

          {/* Right Column - Text & Features */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASE_OUT_EXPO }}
            className="text-left"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4 leading-tight">
              Pick the right trip for your day
            </h2>
            <p className="text-base sm:text-lg text-gray-500 mb-8 max-w-md">
              All our trips are AI-curated and reviewed by our global community of travelers like you.
            </p>

            {/* Feature Tabs */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setActiveFeature((prev) => (prev - 1 + features.length) % features.length)}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-[#F59E0B]/30 transition-all"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <div className="flex gap-2">
                {features.map((feature, idx) => (
                  <button
                    key={feature.id}
                    onClick={() => setActiveFeature(idx)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeFeature === idx
                        ? "bg-[#1e3a5f] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {feature.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setActiveFeature((prev) => (prev + 1) % features.length)}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-[#F59E0B]/30 transition-all"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>

            {/* Feature Description */}
            <motion.p
              key={activeFeature}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-gray-500 mb-6"
            >
              {features[activeFeature].description}
            </motion.p>

            {/* App Store Buttons & QR */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-3 bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#1e3a5f]/90 transition-colors"
              >
                <Apple size={20} />
                <div className="text-left">
                  <div className="text-[10px] text-gray-300 leading-none">Download on the</div>
                  <div className="text-sm font-semibold leading-tight">App Store</div>
                </div>
              </a>

              <div className="flex flex-col items-center">
                <div className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
                  <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs text-center p-1">
                    QR Code
                  </div>
                </div>
                <span className="text-gray-500 text-xs mt-1">Scan to download</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
