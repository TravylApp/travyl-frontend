"use client";

import { motion } from "motion/react";
import { Camera } from "lucide-react";
import { SOCIAL_HASHTAGS, SOCIAL_LINKS, CATEGORY_GRADIENT_CYCLE, EASE_OUT_EXPO, useTagUsDestinations } from "@travyl/shared";

function SocialIcon({ platform }: { platform: string }) {
  const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className: 'text-foreground' };
  switch (platform) {
    case 'twitter':
    case 'x':
      return <svg {...props}><path d="M4 4l11.733 16H20L8.267 4z" /><path d="M4 20l6.768-6.768M15.232 10.232L20 4" /></svg>;
    case 'facebook':
      return <svg {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
    case 'tiktok':
      return <svg {...props}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
    default: // instagram
      return <svg {...props}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /></svg>;
  }
}

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
          className="text-2xl md:text-3xl font-bold text-foreground mb-8"
        >
          Tag us on your <span className="font-extrabold">Next Trip</span>
        </motion.h2>

        {/* Photo placeholders */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {CATEGORY_GRADIENT_CYCLE.map((grad, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: EASE_OUT_EXPO }}
              whileHover={{ scale: 1.03 }}
              className="aspect-square rounded-2xl relative overflow-hidden cursor-pointer group"
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
              <SocialIcon platform={link.platform} />
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