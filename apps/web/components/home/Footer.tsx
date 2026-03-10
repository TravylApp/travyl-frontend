'use client';

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { PaperPlane } from "./PaperPlane";
import { FOOTER_COLUMNS, SOCIAL_LINKS } from "@travyl/shared";
import { Apple, Smartphone } from "lucide-react";

const LANGUAGES = [
  { code: 'en', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-gb', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

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

function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
      >
        <span>{selectedLang.flag}</span>
        <span className="text-gray-300">{selectedLang.name}</span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute bottom-full mb-2 left-0 min-w-[180px] rounded-lg shadow-lg overflow-hidden z-50 bg-gray-800 border border-gray-700"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setSelectedLang(lang);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-gray-700 transition-colors"
            >
              <span>{lang.flag}</span>
              <span className="text-gray-300">{lang.name}</span>
              {selectedLang.code === lang.code && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-auto text-[#F59E0B]"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand column */}
          <motion.div
            className="col-span-2 md:col-span-1"
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <PaperPlane size={18} className="-rotate-12 text-[#F59E0B]" />
              <span className="text-lg font-bold tracking-wide" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                Travyl
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Discover and plan your perfect trip from one place.
            </p>
          </motion.div>

          {/* Explore Links */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <h4 className="font-semibold text-sm mb-4 text-[#F59E0B]">
              <a href="/explore" className="hover:text-[#F59E0B]/80 transition-colors">Explore</a>
            </h4>
            <ul className="space-y-2.5">
              <li><a href="/explore/countries" className="text-sm text-gray-400 hover:text-white transition-colors">Countries</a></li>
              <li><a href="/explore/cities" className="text-sm text-gray-400 hover:text-white transition-colors">Cities</a></li>
              <li><a href="/explore/categories" className="text-sm text-gray-400 hover:text-white transition-colors">Categories</a></li>
              <li><a href="/explore?sort=popular" className="text-sm text-gray-400 hover:text-white transition-colors">Popular Trips</a></li>
            </ul>
          </motion.div>

          {/* Company Links */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="font-semibold text-sm mb-4 text-[#F59E0B]">
              <a href="/about" className="hover:text-[#F59E0B]/80 transition-colors">Company</a>
            </h4>
            <ul className="space-y-2.5">
              <li><a href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">About</a></li>
              <li><a href="/careers" className="text-sm text-gray-400 hover:text-white transition-colors">Careers</a></li>
              <li><a href="/press" className="text-sm text-gray-400 hover:text-white transition-colors">Press</a></li>
              <li><a href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </motion.div>

          {/* Community Links */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <h4 className="font-semibold text-sm mb-4 text-[#F59E0B]">
              <a href="/community" className="hover:text-[#F59E0B]/80 transition-colors">Community</a>
            </h4>
            <ul className="space-y-2.5">
              <li><a href="/support" className="text-sm text-gray-400 hover:text-white transition-colors">Support</a></li>
              <li><a href="/gift" className="text-sm text-gray-400 hover:text-white transition-colors">Gift Cards</a></li>
              <li><a href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</a></li>
              <li><a href="/ambassadors" className="text-sm text-gray-400 hover:text-white transition-colors">Ambassadors</a></li>
            </ul>
          </motion.div>

          {/* App & Social */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h4 className="font-semibold text-sm mb-4">Get the App</h4>
            <div className="space-y-2 mb-6">
              <a
                href="#"
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 transition-colors px-3 py-2.5 rounded-xl border border-gray-700"
              >
                <Apple size={18} />
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 leading-none">Download on the</div>
                  <div className="text-xs font-semibold leading-tight">App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 transition-colors px-3 py-2.5 rounded-xl border border-gray-700"
              >
                <Smartphone size={18} />
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 leading-none">Get it on</div>
                  <div className="text-xs font-semibold leading-tight">Google Play</div>
                </div>
              </a>
            </div>

            <h4 className="font-semibold text-sm mb-3">Connect with us</h4>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-[#F59E0B] border border-gray-700 hover:border-[#F59E0B] flex items-center justify-center transition-all"
                  title={link.platform}
                >
                  <SocialIcon platform={link.platform} size={14} color="white" />
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>&copy; {new Date().getFullYear()} Travyl. All rights reserved.</span>
              <span className="hidden md:inline">•</span>
              <div className="flex items-center gap-4">
                <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-white transition-colors">Terms</a>
                <a href="/cookies" className="hover:text-white transition-colors">Cookies</a>
              </div>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </footer>
  );
}
