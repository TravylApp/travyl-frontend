"use client";

import { motion } from "motion/react";
import { Apple, Star } from "lucide-react";
import { EASE_OUT_EXPO } from "@travyl/shared";

export function MobileShowcase() {
  return (
    <section className="relative py-28 sm:py-36 px-6 overflow-hidden bg-[#f7f5f2] dark:bg-[#0a1018]">
      {/* Image backdrop */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=1080&fit=crop&auto=format&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-55 dark:opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7f5f2]/75 via-[#f7f5f2]/60 to-[#f7f5f2]/85 dark:from-[#0a1018]/90 dark:via-[#0a1018]/75 dark:to-[#0a1018]/90" />
      </div>

      {/* Subtle top border */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gray-300 dark:bg-white/[0.08] z-10" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center lg:justify-between gap-16 lg:gap-12">
          {/* Content — left */}
          <div className="flex-1 max-w-lg text-center lg:text-left">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1, ease: EASE_OUT_EXPO }}
              className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal leading-tight text-gray-900 dark:text-white tracking-wide drop-shadow-sm"
            >
              Take Travyl{" "}
              <span className="italic text-[#c4a882]">anywhere</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT_EXPO }}
              className="text-sm sm:text-base text-gray-800 dark:text-gray-300 mt-4 leading-relaxed max-w-md mx-auto lg:mx-0 font-medium"
            >
              Plan on the web, travel with the app. Your itineraries sync everywhere — offline maps, real-time collaboration, and travel companions in your pocket.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25, ease: EASE_OUT_EXPO }}
              className="flex items-center justify-center lg:justify-start gap-2 mt-6"
            >
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="text-amber-500 fill-amber-500" />
                ))}
              </div>
              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">4.9 · 2.4k+ ratings</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3, ease: EASE_OUT_EXPO }}
              className="flex flex-col sm:flex-row items-center gap-4 mt-8"
            >
              <a
                href="#"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 shadow-xl shadow-gray-900/20 dark:shadow-white/10"
              >
                <Apple size={22} />
                <div className="text-left leading-tight">
                  <div className="text-[9px] opacity-70 font-normal">Download on the</div>
                  <div className="text-sm font-semibold -mt-0.5">App Store</div>
                </div>
              </a>

              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/90 dark:bg-white/10 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-sm backdrop-blur-md">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=https://travyl.app/download"
                    alt="QR code to download Travyl"
                    className="w-12 h-12"
                  />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 leading-tight block">
                    Scan to download
                  </span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight block mt-0.5">
                    Free on the App Store
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Phone — right */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
            className="relative shrink-0 lg:mr-[-2rem] xl:mr-[-4rem]"
          >
            <div className="absolute -inset-4 bg-gradient-to-b from-[#c4a882]/20 via-transparent to-transparent rounded-[3.5rem] blur-2xl" />
            <div
              style={{ width: "300px", height: "560px" }}
              className="relative rounded-[3rem] border-[4px] border-gray-800 dark:border-gray-600 shadow-2xl overflow-hidden"
            >
              {/* Phone screen - fully inlined */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#ffffff",
                }}
              >
                {/* Dynamic Island */}
                <div className="relative shrink-0">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[110px] h-[26px] bg-black rounded-b-2xl z-20" />
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-5 pt-3 pb-1 z-10 relative">
                    <span
                      style={{ color: "#111827" }}
                      className="text-[11px] font-semibold"
                    >
                      9:41
                    </span>
                    <div className="w-3.5 h-2 rounded-sm border border-gray-400 relative overflow-hidden">
                      <div className="absolute inset-[1px] right-[30%] bg-gray-400 rounded-[1px]" />
                    </div>
                  </div>
                </div>

                {/* App header */}
                <div className="flex items-center justify-between px-4 py-1">
                  <div className="flex items-center gap-2">
                    <div
                      style={{ backgroundColor: "#1e3a5f" }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                    >
                      <span className="text-[8px] font-bold text-white">T</span>
                    </div>
                    <span
                      style={{ color: "#111827" }}
                      className="text-[11px] font-semibold"
                    >
                      Travyl
                    </span>
                  </div>
                  <div
                    style={{ backgroundColor: "#c4a882" }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  >
                    AJ
                  </div>
                </div>

                {/* Search bar */}
                <div
                  style={{ backgroundColor: "#f3f4f6" }}
                  className="mx-4 my-1.5 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5"
                >
                  <svg
                    className="w-3.5 h-3.5 text-gray-400 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M16.5 16.5L21 21" />
                  </svg>
                  <span className="text-[10px] text-gray-400">
                    Search destinations...
                  </span>
                </div>

                {/* Section label */}
                <div className="flex items-center justify-between px-4 mt-1">
                  <span className="text-[11px] font-bold" style={{ color: "#111827" }}>
                    Your Trips
                  </span>
                  <span className="text-[9px] text-[#c4a882] font-medium">
                    See all
                  </span>
                </div>

                {/* Trip cards */}
                <div className="px-4 mt-2 flex flex-col gap-2">
                  {/* Tokyo */}
                  <div
                    style={{ backgroundColor: "#ffffff" }}
                    className="rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                  >
                    <div className="flex">
                      <div className="w-[68px] shrink-0 self-stretch overflow-hidden">
                        <img
                          src="https://images.pexels.com/photos/2614818/pexels-photo-2614818.jpeg?auto=compress&cs=tinysrgb&w=136&h=160&fit=crop"
                          alt="Tokyo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 px-2.5 py-2">
                        <p className="text-[11px] font-bold" style={{ color: "#111827" }}>
                          Tokyo Weekend
                        </p>
                        <p className="text-[8px] text-gray-500 mt-0.5">
                          Japan · Mar 15-20
                        </p>
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[7px] font-semibold text-emerald-600">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Paris */}
                  <div
                    style={{ backgroundColor: "#ffffff" }}
                    className="rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                  >
                    <div className="flex">
                      <div className="w-[68px] shrink-0 self-stretch overflow-hidden">
                        <img
                          src="https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=136&h=160&fit=crop"
                          alt="Paris"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 px-2.5 py-2">
                        <p className="text-[11px] font-bold" style={{ color: "#111827" }}>
                          Paris Getaway
                        </p>
                        <p className="text-[8px] text-gray-500 mt-0.5">
                          France · Apr 8-14
                        </p>
                        <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span className="text-[7px] font-semibold text-amber-600">
                            Planning
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Bottom nav */}
                <div className="flex items-center justify-around py-2.5 px-2 border-t border-gray-100 bg-white">
                  {[
                    { icon: "home", active: true, label: "Home" },
                    { icon: "heart", active: false, label: "Saved" },
                    { icon: "map", active: false, label: "Trips" },
                    { icon: "user", active: false, label: "Profile" },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-4 h-4"
                        style={{
                          color: item.active ? "#1e3a5f" : "#d1d5db",
                        }}
                      >
                        {item.icon === "home" && (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        )}
                        {item.icon === "heart" && (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        )}
                        {item.icon === "map" && (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        )}
                        {item.icon === "user" && (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <span
                        className="text-[6px] uppercase tracking-wider"
                        style={{
                          color: item.active ? "#1e3a5f" : "#d1d5db",
                          fontWeight: item.active ? 600 : 400,
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default MobileShowcase;
