'use client';

import { useState, useRef, useEffect } from "react";
import { PaperPlane } from "./PaperPlane";
import { FOOTER_COLUMNS, SOCIAL_LINKS } from "@travyl/shared";

const FLAG_BASE = 'https://flagcdn.com/24x18';

const LANGUAGES = [
  { code: 'en', name: 'English', cca2: 'us' },
  { code: 'es', name: 'Español', cca2: 'es' },
  { code: 'fr', name: 'Français', cca2: 'fr' },
  { code: 'de', name: 'Deutsch', cca2: 'de' },
  { code: 'pt', name: 'Português', cca2: 'br' },
  { code: 'zh-CN', name: '中文', cca2: 'cn' },
  { code: 'ja', name: '日本語', cca2: 'jp' },
  { code: 'ko', name: '한국어', cca2: 'kr' },
  { code: 'ar', name: 'العربية', cca2: 'sa' },
  { code: 'it', name: 'Italiano', cca2: 'it' },
  { code: 'hi', name: 'हिन्दी', cca2: 'in' },
];

import { SocialIcon } from "@/components/icons/SocialIcon";

function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('travyl-lang');
    if (saved) {
      const lang = LANGUAGES.find((l) => l.code === saved);
      if (lang) setSelectedLang(lang);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lang: typeof LANGUAGES[number]) => {
    setSelectedLang(lang);
    setIsOpen(false);
    localStorage.setItem('travyl-lang', lang.code);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition-all hover:scale-105 bg-sand-wash hover:bg-sand-wash/80 dark:bg-white/10 dark:hover:bg-white/20"
        title={selectedLang.name}
      >
        <img
          src={`${FLAG_BASE}/${selectedLang.cca2}.png`}
          alt={selectedLang.name}
          className="w-5 h-3.5 rounded-[2px] object-cover shadow-sm"
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 min-w-[180px] rounded-xl shadow-xl overflow-hidden z-50 bg-magazine-surface dark:bg-muted border border-magazine-border animate-[fadeSlideIn_0.2s_ease-out]">
          <div className="max-h-[300px] overflow-y-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-sand-base dark:hover:bg-white/10 text-magazine-text"
              >
                <img
                  src={`${FLAG_BASE}/${lang.cca2}.png`}
                  alt={lang.name}
                  className="w-5 h-3.5 rounded-[2px] object-cover shadow-sm"
                />
                <span>{lang.name}</span>
                {selectedLang.code === lang.code && (
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="ml-auto text-magazine-heading"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-sand-base">

      {/* ─── Footer links ─────────────────────────────── */}
      <div className="border-t border-magazine-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Brand column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-xl font-black tracking-[1.5px] text-magazine-heading">
                  TRAVYL
                </span>
                <PaperPlane size={28} className="text-magazine-heading" />
              </div>
              <p className="text-sm leading-relaxed text-magazine-text">
                Discover and plan your perfect trip from one place. Explore destinations, find the best hotels and flights, and create unforgettable itineraries.
              </p>
            </div>

            {/* Link columns */}
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h4 className="font-semibold text-sm mb-3 text-magazine-heading">
                  {col.heading}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm hover:opacity-80 transition-opacity text-magazine-text"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Social + Language */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-magazine-heading">
                Connect
              </h4>
              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-sand-wash hover:bg-sand-wash/80 dark:bg-white/10 dark:hover:bg-white/20"
                    title={link.platform}
                  >
                    <SocialIcon platform={link.platform} size={16} className="text-magazine-heading" />
                  </a>
                ))}
                <LanguageSelector />
              </div>
            </div>
          </div>

          {/* Copyright + Theme toggle */}
          <div className="md:col-span-5 mt-8 pt-6 flex items-center justify-between border-t border-magazine-border">
            <p className="text-xs text-magazine-text">
              &copy; {new Date().getFullYear()} Travyl. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
