"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Instagram, Twitter, Facebook } from "lucide-react";
import { EASE_OUT_EXPO } from "@travyl/shared";

const socialLinks = [
  { platform: "Instagram", icon: Instagram, url: "https://instagram.com/travyl" },
  { platform: "Twitter", icon: Twitter, url: "https://twitter.com/travyl" },
  { platform: "Facebook", icon: Facebook, url: "https://facebook.com/travyl" },
];

const userPhotos = [
  { id: 1, image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=400&fit=crop", user: "@traveler1" },
  { id: 2, image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=400&fit=crop", user: "@wanderlust" },
  { id: 3, image: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=400&fit=crop", user: "@adventuretime" },
  { id: 4, image: "https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=400&h=400&fit=crop", user: "@explorer" },
  { id: 5, image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=400&fit=crop", user: "@roadtripper" },
  { id: 6, image: "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=400&h=400&fit=crop", user: "@romanticgetaway" },
];

export function SocialProof() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="py-16 px-6 bg-[#FAFBFC]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-[#1e3a5f] mb-2">
              Share your next adventure
            </h2>
            <p className="text-gray-600">
              Show us how you{" "}
              <span className="font-semibold text-[#F59E0B]">#Travyl</span>{" "}
              by tagging us{" "}
              <span className="font-semibold text-[#1e3a5f]">@TravylApp</span>{" "}
              for a chance to be featured!
            </p>
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT_EXPO }}
            className="flex items-center gap-3 mt-4 md:mt-0"
          >
            {socialLinks.map((social) => (
              <a
                key={social.platform}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:shadow-md hover:ring-1 hover:ring-[#F59E0B]/30 transition-all"
                aria-label={social.platform}
              >
                <social.icon size={18} className="text-[#1e3a5f]" />
              </a>
            ))}
          </motion.div>
        </div>

        {/* User Photos Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
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

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide px-2 py-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {userPhotos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: EASE_OUT_EXPO }}
                className="flex-shrink-0"
              >
                <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-xl overflow-hidden ring-1 ring-gray-100 hover:ring-[#F59E0B]/50 transition-all cursor-pointer">
                  <img
                    src={photo.image}
                    alt={`Photo by ${photo.user}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-2 left-2 text-white text-xs font-medium">
                    {photo.user}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
