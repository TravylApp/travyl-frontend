'use client';

import { useState, useRef, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { PaperPlane } from "./PaperPlane";
import { FOOTER_COLUMNS, SOCIAL_LINKS } from "@travyl/shared";

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
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
      className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm font-medium bg-[#d4bc94] hover:bg-[#c4a882] dark:bg-white/10 dark:hover:bg-white/20 text-[#2a1f17] dark:text-[var(--magazine-text)]"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      <span className="text-xs">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}

// Triggers Google Translate to translate the page
function triggerTranslate(langCode: string) {
  // Set a cookie that Google Translate reads
  document.cookie = `googtrans=/en/${langCode};path=/;`;
  document.cookie = `googtrans=/en/${langCode};path=/;domain=${window.location.hostname}`;

  // If the Google Translate element exists, trigger it
  const frame = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (frame) {
    frame.value = langCode;
    frame.dispatchEvent(new Event('change'));
    return;
  }

  // Otherwise reload to let the script pick up the cookie
  window.location.reload();
}

function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read saved language on mount
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

    if (lang.code === 'en') {
      // Reset to English — clear the cookie and reload
      document.cookie = `googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `googtrans=;path=/;domain=${window.location.hostname};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      window.location.reload();
      return;
    }

    triggerTranslate(lang.code);
  };

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
        <div className="absolute bottom-full mb-2 right-0 min-w-[180px] rounded-xl shadow-xl overflow-hidden z-50 bg-[#f5ebe0] dark:bg-[#1a2230] border border-[#c4a882]/30 dark:border-white/10 animate-[fadeSlideIn_0.2s_ease-out]">
          <div className="max-h-[300px] overflow-y-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[#e8d5c0] dark:hover:bg-white/10 text-[#3d2f23] dark:text-[var(--magazine-text)]"
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.name}</span>
                {selectedLang.code === lang.code && (
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="ml-auto text-[#2a1f17] dark:text-[var(--magazine-text)]"
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
  // Load Google Translate script once
  useEffect(() => {
    if (document.getElementById('google-translate-script')) return;

    // Hidden element Google Translate requires
    const el = document.createElement('div');
    el.id = 'google_translate_element';
    el.style.display = 'none';
    document.body.appendChild(el);

    // Init function
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      );

      // Apply saved language after init
      const saved = localStorage.getItem('travyl-lang');
      if (saved && saved !== 'en') {
        setTimeout(() => triggerTranslate(saved), 500);
      }
    };

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Don't remove — Google Translate doesn't support re-init
    };
  }, []);

  return (
    <footer className="py-10 px-6 bg-[var(--sand-base)]">
      {/* Hide Google Translate's default banner */}
      <style>{`
        .goog-te-banner-frame, .skiptranslate, #goog-gt-tt,
        .goog-te-balloon-frame, .goog-tooltip { display: none !important; }
        body { top: 0 !important; }
        .goog-te-gadget { font-size: 0 !important; }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xl font-black tracking-[1.5px] text-[#2a1f17] dark:text-[var(--magazine-heading)]">
                TRAVYL
              </span>
              <PaperPlane size={28} className="text-[#2a1f17] dark:text-[var(--magazine-heading)]" />
            </div>
            <p className="text-sm leading-relaxed text-[#3d2f23] dark:text-[var(--magazine-text)]">
              Discover and plan your perfect trip from one place. Explore destinations, find the best hotels and flights, and create unforgettable itineraries.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
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
            </div>
          ))}

          {/* Social + Language column */}
          <div>
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
                  <SocialIcon platform={link.platform} size={16} className="text-[#2a1f17] dark:text-[var(--magazine-text)]" />
                </a>
              ))}
              <LanguageSelector />
            </div>
          </div>
        </div>

        {/* Copyright + Theme toggle */}
        <div className="mt-8 pt-6 flex items-center justify-between border-t border-[#c4a882] dark:border-white/[0.06]">
          <p className="text-xs text-[#2a1f17] dark:text-[var(--magazine-text)]">
            &copy; {new Date().getFullYear()} Travyl. All rights reserved.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
