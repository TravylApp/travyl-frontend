'use client';

import { motion } from "motion/react";
import { PaperPlane } from "./PaperPlane";
import { FOOTER_COLUMNS, SOCIAL_LINKS } from "@travyl/shared";

function SocialIcon({ platform, size = 16, color = 'currentColor' }: { platform: string; size?: number; color?: string }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (platform) {
    case 'twitter':
    case 'x':
      return <svg {...props}><path d="M4 4l11.733 16H20L8.267 4z" /><path d="M4 20l6.768-6.768M15.232 10.232L20 4" /></svg>;
    case 'facebook':
      return <svg {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
    case 'tiktok':
      return <svg {...props}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>;
    default: // instagram
      return <svg {...props}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill={color} stroke="none" /></svg>;
  }
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
};

export function Footer() {
  return (
    <motion.footer
      className="py-10 px-6"
      style={{ backgroundColor: '#e8d5c0' }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <motion.div
            className="md:col-span-1"
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl font-black tracking-[1.5px]" style={{ color: '#2a1f17' }}>
                TRAVYL
              </span>
              <PaperPlane size={16} className="-rotate-12" style={{ color: '#2a1f17' }} />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#3d2f23' }}>
              Discover and plan your perfect trip from one place. Explore destinations, find the best hotels and flights, and create unforgettable itineraries.
            </p>
          </motion.div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col, i) => (
            <motion.div
              key={col.heading}
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
            >
              <h4 className="font-semibold text-sm mb-3" style={{ color: '#2a1f17' }}>
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm hover:opacity-80 transition-opacity"
                      style={{ color: '#3d2f23' }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Social column */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <h4 className="font-semibold text-sm mb-3" style={{ color: '#2a1f17' }}>
              Follow Us
            </h4>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: '#d4bc94' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c4a882')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#d4bc94')}
                  title={link.platform}
                >
                  <SocialIcon platform={link.platform} size={16} color="#5c4a3a" />
                </a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Copyright */}
        <motion.div
          className="mt-8 pt-6 text-center"
          style={{ borderTop: '1px solid #c4a882' }}
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-xs" style={{ color: '#5c4a3a' }}>
            &copy; {new Date().getFullYear()} Travyl. All rights reserved.
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
}
