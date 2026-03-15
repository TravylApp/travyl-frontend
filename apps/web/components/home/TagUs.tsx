"use client";

import { motion } from "motion/react";
import { Camera } from "lucide-react";
import { SOCIAL_HASHTAGS, SOCIAL_LINKS, CATEGORY_GRADIENT_CYCLE, EASE_OUT_EXPO, useTagUsDestinations } from "@travyl/shared";

import { SocialIcon } from "@/components/icons/SocialIcon";

export function TagUs() {
  const destinations = useTagUsDestinations();

  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="text-2xl md:text-3xl text-foreground mb-8"
        >
          <span className="font-extrabold">Tag us</span>{" "}
          <span className="font-normal italic">on your Next Trip</span>
        </motion.h2>

        {/* Photo placeholders — scroll on small, grid on md+ */}
        <div
          className="flex md:grid md:grid-cols-4 gap-4 mb-8 overflow-x-auto md:overflow-visible px-6 md:px-0 -mx-6 md:mx-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {CATEGORY_GRADIENT_CYCLE.map((grad, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: EASE_OUT_EXPO }}
              whileHover={{ scale: 1.03 }}
              className="aspect-square rounded-2xl relative overflow-hidden cursor-pointer group flex-shrink-0 w-48 md:w-auto"
              style={{
                background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
              }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Camera size={28} className="text-white/40 group-hover:text-white/60 transition-colors" />
                <span className="text-white/50 text-xs font-medium group-hover:text-white/70 transition-colors">
                  {destinations[i]}
                </span>
              </div>
              <div className="absolute bottom-3 left-3">
                <span className="text-white/30 text-xs font-medium">
                  @travyl
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Social icons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3, ease: EASE_OUT_EXPO }}
          className="flex items-center justify-center gap-4 mb-4"
        >
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
        </motion.div>

        {/* Hashtags */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4, ease: EASE_OUT_EXPO }}
          className="text-sm text-muted-foreground"
        >
          {SOCIAL_HASHTAGS.join(" ")}
        </motion.p>
      </div>
    </section>
  );
}
