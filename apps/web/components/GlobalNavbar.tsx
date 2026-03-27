"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MapPin, Luggage, User, Settings, LogOut, Sun, Moon, Menu, X } from "lucide-react";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { useAuthStore } from "@travyl/shared";

const baseNavLinks = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/places", label: "Places", icon: MapPin },
  { href: "/trips", label: "Trips", icon: Luggage },
];

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const AUTH_PAGES = ["/login", "/signup"];

export default function GlobalNavbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name;
  const email = user?.email;
  const initials = getInitials(displayName);

  const navLinks = user
    ? [...baseNavLinks, { href: "/profile", label: "Profile", icon: User }]
    : baseNavLinks;

  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isCalendarTab = /\/trip\/[^/]+\/calendar$/.test(pathname);
  const isHomePage = pathname === "/";
  const useLightNav = isHomePage && !scrolled;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = savedTheme === "dark";
    setIsDarkMode(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = useCallback(() => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newDarkMode);
  }, [isDarkMode]);

  const handleSignOut = useCallback(async () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
  }, [signOut]);

  if (isAuthPage || isCalendarTab) return null;

  return (
    <>
      {/* Inject keyframes + navbar transition styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .gnav {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
          width: 100%;
          height: 56px;
          border-radius: 0px;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          box-shadow: none;
          will-change: width, height, border-radius, top, background, box-shadow;
          transition:
            width 0.55s cubic-bezier(0.22, 1, 0.36, 1),
            height 0.55s cubic-bezier(0.22, 1, 0.36, 1),
            border-radius 0.55s cubic-bezier(0.22, 1, 0.36, 1),
            top 0.55s cubic-bezier(0.22, 1, 0.36, 1),
            background 0.4s ease,
            box-shadow 0.4s ease,
            border 0.4s ease;
        }
        .gnav.scrolled {
          top: 12px;
          width: min(92%, 64rem);
          height: 48px;
          border-radius: 9999px;
          border-bottom: none;
        }
        /* Light mode backgrounds */
        .gnav.bg-clear { background: rgba(255,255,255,0.45); }
        .gnav.bg-clear-hero { background: rgba(255,255,255,0.05); border-bottom-color: rgba(255,255,255,0.1); }
        .gnav.scrolled.bg-clear {
          background: rgba(255,255,255,0.65);
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6);
        }
        .gnav.scrolled.bg-clear-hero {
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        /* Dark mode backgrounds */
        :root.dark .gnav.bg-clear { background: rgba(10,21,32,0.5); border-bottom-color: rgba(30,58,95,0.2); }
        :root.dark .gnav.scrolled.bg-clear {
          background: rgba(10,21,32,0.7);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04);
        }
        /* Inner container */
        .gnav-inner {
          max-width: 80rem;
          transition: max-width 0.55s cubic-bezier(0.22, 1, 0.36, 1), padding 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .gnav.scrolled .gnav-inner { max-width: 100%; }

        /* Mobile menu */
        .gnav-mobile-menu {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease;
        }
        .gnav-mobile-menu.open {
          max-height: 400px;
          opacity: 1;
        }

        @media (max-width: 639px) {
          .gnav { height: 48px; }
          .gnav.scrolled { top: 8px; width: min(95%, 64rem); height: 44px; }
        }
      ` }} />

      <nav className={`gnav ${scrolled ? "scrolled" : ""} ${useLightNav ? "bg-clear-hero" : "bg-clear"}`}>
        <div className="gnav-inner mx-auto flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className={`flex items-center gap-1 tracking-[1.5px] shrink-0 transition-colors duration-300 ${
              useLightNav ? "text-white" : "text-[#1e3a5f] dark:text-[#f5efe8]"
            }`}
            style={{ fontFamily: "var(--font-brand)", fontWeight: 800, fontSize: scrolled ? 17 : 19 }}
          >
            <span className="hidden sm:inline">TRAVYL</span>
            <PaperPlane size={scrolled ? 22 : 24} className="shrink-0" />
          </Link>

          {/* Center nav — desktop only */}
          <div className="hidden sm:flex flex-1 items-center justify-center gap-1.5 min-w-0">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={[
                  "rounded-full border flex items-center whitespace-nowrap transition-all duration-300",
                  "px-3 md:px-4 py-1.5 text-xs md:text-sm gap-1.5",
                  isActive(href)
                    ? useLightNav
                      ? "bg-white/20 text-white border-white/40 font-semibold"
                      : "bg-[#1e3a5f] dark:bg-white/20 text-white border-[#1e3a5f] dark:border-white/30 font-semibold shadow-sm"
                    : useLightNav
                      ? "text-white border-white/20 hover:bg-white/10 hover:border-white/40"
                      : "text-[#1e3a5f] dark:text-[#f5efe8] border-[#1e3a5f]/12 dark:border-[#f5efe8]/12 hover:bg-[#1e3a5f]/5 dark:hover:bg-white/8 hover:border-[#1e3a5f]/25 dark:hover:border-white/25",
                ].join(" ")}
              >
                <Icon size={15} className="shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* Right side — desktop */}
          <div className="hidden sm:flex items-center shrink-0">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center rounded-full hover:ring-2 hover:ring-[#1e3a5f]/20 dark:hover:ring-white/20 transition-all"
                >
                  <div
                    className={`h-8 w-8 flex items-center justify-center rounded-full overflow-hidden font-medium text-sm transition-colors duration-300 ${
                      useLightNav ? "bg-white/20 text-white" : "bg-[#1e3a5f] text-white"
                    }`}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName || "User"} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl py-1.5 z-50 backdrop-blur-2xl"
                    style={{
                      background: isDarkMode ? "rgba(15, 26, 40, 0.85)" : "rgba(255, 255, 255, 0.85)",
                      border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                      boxShadow: isDarkMode
                        ? "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)"
                        : "0 16px 48px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
                    }}
                  >
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-[#1e3a5f]/20">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 flex items-center justify-center rounded-full overflow-hidden bg-[#1e3a5f] text-white font-medium text-sm shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName || "User"} className="h-full w-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8] truncate">
                            {displayName || "User"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-[#4a7ab5] truncate">{email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-0.5">
                      <Link href="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg mx-1">
                        <User size={15} className="text-gray-400" /> Your Profile
                      </Link>
                      <Link href="/profile/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg mx-1">
                        <Settings size={15} className="text-gray-400" /> Settings
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 dark:border-[#1e3a5f]/20 py-1">
                      <button onClick={toggleTheme} className="w-[calc(100%-8px)] flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg mx-1">
                        <span className="flex items-center gap-2.5">
                          {isDarkMode ? <Moon size={15} className="text-gray-400" /> : <Sun size={15} className="text-gray-400" />}
                          {isDarkMode ? "Dark Mode" : "Light Mode"}
                        </span>
                        <div className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${isDarkMode ? "bg-[#1e3a5f]" : "bg-gray-200"}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${isDarkMode ? "translate-x-4" : "translate-x-0.5"}`}>
                            {isDarkMode ? <Moon size={10} className="text-[#1e3a5f]" /> : <Sun size={10} className="text-amber-500" />}
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="border-t border-gray-100 dark:border-[#1e3a5f]/20 py-0.5">
                      <button onClick={handleSignOut} className="w-[calc(100%-8px)] flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors rounded-lg mx-1">
                        <LogOut size={15} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className={`flex items-center px-4 py-1.5 rounded-full text-sm border transition-all duration-300 ${
                  useLightNav
                    ? "border-white/30 text-white hover:bg-white hover:text-[#1e3a5f]"
                    : "border-[#1e3a5f]/20 dark:border-[#f5efe8]/20 text-[#1e3a5f] dark:text-[#f5efe8] hover:bg-[#1e3a5f] dark:hover:bg-white/10 hover:text-white"
                }`}
              >
                Log In
              </Link>
            )}
          </div>

          {/* Mobile — hamburger + CTA */}
          <div className="flex sm:hidden items-center gap-2 shrink-0">
            {!loading && !user && (
              <Link
                href="/login"
                className={`px-3 py-1 rounded-full text-xs border transition-all duration-300 ${
                  useLightNav
                    ? "border-white/30 text-white hover:bg-white hover:text-[#1e3a5f]"
                    : "border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
                }`}
              >
                Log In
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-1.5 rounded-full transition-colors duration-300 ${
                useLightNav ? "text-white hover:bg-white/10" : "text-[#1e3a5f] dark:text-[#f5efe8] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      <div
        className={`gnav-mobile-menu fixed left-0 right-0 z-40 sm:hidden backdrop-blur-2xl ${mobileMenuOpen ? "open" : ""}`}
        style={{
          top: scrolled ? 56 : 48,
          background: isDarkMode ? "rgba(10,21,32,0.92)" : "rgba(255,255,255,0.92)",
          borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          boxShadow: mobileMenuOpen ? "0 16px 48px rgba(0,0,0,0.1)" : "none",
          transition: "max-height 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease, top 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="px-4 py-3 flex flex-col gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                isActive(href)
                  ? "bg-[#1e3a5f]/10 dark:bg-white/10 text-[#1e3a5f] dark:text-white font-semibold"
                  : "text-gray-700 dark:text-[#cdd9e5] hover:bg-black/5 dark:hover:bg-white/5",
              ].join(" ")}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
          <div className="border-t border-gray-100 dark:border-white/10 mt-1 pt-1">
            <button onClick={toggleTheme} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <span className="flex items-center gap-3">
                {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                {isDarkMode ? "Dark Mode" : "Light Mode"}
              </span>
            </button>
            {user && (
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                <LogOut size={18} /> Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
