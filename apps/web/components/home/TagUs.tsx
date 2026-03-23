"use client";

import { useMemo } from "react";
import { Camera } from "lucide-react";
import { SOCIAL_HASHTAGS, SOCIAL_LINKS, CATEGORY_GRADIENT_CYCLE, useTagUsDestinations, usePlaceImages } from "@travyl/shared";

import { SocialIcon } from "@/components/icons/SocialIcon";

function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function TagUs() {
  const destinations = useTagUsDestinations();
  const imageQueries = usePlaceImages(destinations);

  const indices = useMemo(() => {
    const arr = destinations.map((_, i) => i);
    const seed = dailySeed();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(((seed * 2654435761 + i * 1597334677) >>> 0) / 4294967296 * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [destinations]);

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl text-foreground mb-8">
          <span className="font-extrabold">Tag us</span>{" "}
          <span className="font-normal italic">on your Next Trip</span>
        </h2>

        <div
          className="flex md:grid md:grid-cols-4 gap-4 mb-8 overflow-x-auto md:overflow-visible px-6 md:px-0 -mx-6 md:mx-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {indices.map((idx) => {
            const grad = CATEGORY_GRADIENT_CYCLE[idx % CATEGORY_GRADIENT_CYCLE.length];
            const dest = destinations[idx];
            const imgUrl = imageQueries[idx]?.data?.url;
            return (
              <div
                key={dest || idx}
                className="aspect-square rounded-2xl relative overflow-hidden cursor-pointer group flex-shrink-0 w-48 md:w-auto ring-2 ring-transparent hover:ring-white/30 transition-all duration-300"
                style={{
                  background: imgUrl
                    ? undefined
                    : `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                }}
              >
                {imgUrl && (
                  <img
                    src={imgUrl}
                    alt={dest}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                    className="absolute inset-0 w-full h-full object-cover will-change-transform group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-black/5 group-hover:from-black/70 group-hover:via-black/30 group-hover:to-black/15 transition-all duration-300" />

                {/* Hover content — fades + scales in */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 ease-out">
                  <Camera size={28} className="text-white drop-shadow-lg" />
                  <span className="text-white text-sm font-semibold drop-shadow-lg">
                    {dest}
                  </span>
                  <span className="text-white/50 text-[10px] font-medium">
                    @travyl
                  </span>
                </div>

                {/* Subtle "hover me" shimmer when not hovered */}
                <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-300">
                  <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center animate-pulse">
                    <Camera size={16} className="text-white/30" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-foreground/20 transition-colors"
              title={link.platform}
            >
              <SocialIcon platform={link.platform} size={20} className="text-foreground" />
            </a>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          {SOCIAL_HASHTAGS.join(" ")}
        </p>
      </div>
    </section>
  );
}
