'use client';

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { PaperPlane } from "./PaperPlane";
import { FOOTER_COLUMNS, SOCIAL_LINKS } from "@travyl/shared";

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

import { SocialIcon } from "@/components/icons/SocialIcon";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm font-medium bg-[#d4bc94] hover:bg-[#c4a882] dark:bg-white/10 dark:hover:bg-white/20 text-[#5c4a3a] dark:text-[var(--magazine-text)]"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      <span className="text-xs">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
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
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all hover:scale-105 bg-[#d4bc94] hover:bg-[#c4a882] dark:bg-white/10 dark:hover:bg-white/20"
        title={selectedLang.name}
      >
        {selectedLang.flag}
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 right-0 min-w-[160px] rounded-lg shadow-lg overflow-hidden z-50 bg-[#f5ebe0] dark:bg-[#1a2230]"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setSelectedLang(lang);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[#e8d5c0] dark:hover:bg-white/10 text-[#3d2f23] dark:text-[var(--magazine-text)]"
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
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
                  className="ml-auto text-[#5c4a3a] dark:text-[var(--magazine-text)]"
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
    <motion.footer
      className="py-10 px-6 bg-[var(--sand-base)]"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <motion.div
            className="md:col-span-1"
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xl font-black tracking-[1.5px] text-[#2a1f17] dark:text-[var(--magazine-heading)]">
                TRAVYL
              </span>
              <PaperPlane size={28} className="text-[#2a1f17] dark:text-[var(--magazine-heading)]" />
            </div>
            <p className="text-sm leading-relaxed text-[#3d2f23] dark:text-[var(--magazine-text)]">
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
              <h4 className="font-semibold text-sm mb-3 text-[#2a1f17] dark:text-[var(--magazine-heading)]">
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm hover:opacity-80 transition-opacity text-[#3d2f23] dark:text-[var(--magazine-text)]"
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
            <h4 className="font-semibold text-sm mb-3 text-[#2a1f17] dark:text-[var(--magazine-heading)]">
              Follow Us
            </h4>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[#d4bc94] hover:bg-[#c4a882] dark:bg-white/10 dark:hover:bg-white/20"
                  title={link.platform}
                >
                  <SocialIcon platform={link.platform} size={16} className="text-[#5c4a3a] dark:text-[var(--magazine-text)]" />
                </a>
              ))}
              <LanguageSelector />
            </div>
          </motion.div>
        </div>

        {/* Copyright + Theme toggle */}
        <motion.div
          className="mt-8 pt-6 flex items-center justify-between border-t border-[#c4a882] dark:border-white/[0.06]"
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-xs text-[#5c4a3a] dark:text-[var(--magazine-text)]">
            &copy; {new Date().getFullYear()} Travyl. All rights reserved.
          </p>
          <ThemeToggle />
        </motion.div>
      </div>
    </motion.footer>
  );
}
