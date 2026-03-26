"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MapPin, Luggage, User, Settings, LogOut, Sun, Moon } from "lucide-react";
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

export default function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name;
  const email = user?.email;
  const initials = getInitials(displayName);

  const navLinks = user
    ? [...baseNavLinks, { href: "/profile", label: "Profile", icon: User }]
    : baseNavLinks;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // On the home page, the hero is dark — use light text until user scrolls past it
  const isHomePage = pathname === "/";
  // When on home and not scrolled, use light (white) nav. Otherwise dark nav.
  const useLightNav = isHomePage && !scrolled;

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
    const prefersDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
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

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newDarkMode);
  };

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
  };

  const Avatar = ({ size = "md" }: { size?: "md" | "sm" }) => {
    const sizeClasses = size === "sm" ? "h-8 w-8 text-xs" : "h-8 w-8 text-sm";
    return (
      <div
        className={`${sizeClasses} flex items-center justify-center rounded-full overflow-hidden ${
          useLightNav ? "bg-white/20 text-white" : "bg-[#1e3a5f] text-white"
        } font-medium`}
      >
        {avatarUrl && !avatarError ? (
          <img src={avatarUrl} alt={displayName || "User"} className="h-full w-full object-cover" onError={() => setAvatarError(true)} />
        ) : (
          initials
        )}
      </div>
    );
  };

  // Color tokens based on background
  const textColor = useLightNav ? "text-white" : "text-[#1e3a5f]";
  const borderColor = useLightNav ? "border-white/25" : "border-[#1e3a5f]/25";
  const hoverBg = useLightNav ? "hover:bg-white/10 hover:border-white/40" : "hover:bg-[#1e3a5f]/5 hover:border-[#1e3a5f]/50";
  const activeBg = useLightNav ? "bg-white/20 text-white border-white/40 font-semibold" : "bg-[#1e3a5f] text-white border-[#1e3a5f] font-semibold shadow-sm";
  const navBg = scrolled
    ? (useLightNav ? "bg-black/20" : "bg-white/80")
    : (useLightNav ? "bg-white/10" : "bg-white/30");

  return (
    <nav
      className={`fixed left-1/2 -translate-x-1/2 z-50 rounded-full border backdrop-blur-xl shadow-lg shadow-black/[0.06] transition-all duration-500 ease-out ${
        useLightNav ? "border-white/15" : "border-white/20"
      } ${
        scrolled
          ? `top-5 w-[calc(100%-3rem)] max-w-6xl ${navBg}`
          : `top-3 w-[calc(100%-2rem)] max-w-5xl ${navBg}`
      }`}
    >
      <div
        className={`mx-auto flex items-center justify-between transition-all duration-500 ease-out ${
          scrolled ? "h-14 px-3 sm:px-5 md:px-7" : "h-11 px-3 sm:px-4 md:px-5"
        }`}
      >
        {/* Logo */}
        <Link
          href="/"
          className={`flex items-center gap-0.5 sm:gap-1 ${textColor} tracking-[1px] sm:tracking-[2px] transition-all duration-500 shrink-0 ${
            scrolled ? "text-lg sm:text-2xl" : "text-base sm:text-xl"
          }`}
          style={{ fontFamily: 'var(--font-brand)', fontWeight: 800 }}
        >
          <span className="hidden sm:inline">TRAVYL</span>
          <PaperPlane size={scrolled ? 28 : 24} className="transition-all duration-500" />
        </Link>

        {/* Center nav */}
        <div className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5 min-w-0 overflow-hidden">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-full border flex items-center whitespace-nowrap transition-all duration-500 ${
                scrolled
                  ? "px-2.5 sm:px-3.5 md:px-5 py-1.5 sm:py-1.5 md:py-2 text-xs md:text-sm gap-0 sm:gap-1.5 md:gap-2"
                  : "px-2 sm:px-3 md:px-4 py-1.5 sm:py-1.5 text-xs md:text-sm gap-0 sm:gap-1.5"
              } ${
                isActive(href)
                  ? activeBg
                  : `${textColor} ${borderColor} ${hoverBg}`
              }`}
            >
              <Icon size={scrolled ? 16 : 14} className="shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>

        {/* Right side */}
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse shrink-0" />
        ) : user ? (
          <div className="flex items-center shrink-0">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-white/20 transition-all"
              >
                <Avatar />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {displayName || "User"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-0.5">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User size={15} className="text-gray-400" />
                      Your Profile
                    </Link>
                    <Link
                      href="/profile/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={15} className="text-gray-400" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        {isDarkMode ? <Moon size={15} className="text-gray-400" /> : <Sun size={15} className="text-gray-400" />}
                        {isDarkMode ? "Dark Mode" : "Light Mode"}
                      </span>
                      <div
                        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
                          isDarkMode ? "bg-[#1e3a5f]" : "bg-gray-200"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
                            isDarkMode ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        >
                          {isDarkMode ? (
                            <Moon size={10} className="text-[#1e3a5f]" />
                          ) : (
                            <Sun size={10} className="text-amber-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                  <div className="border-t border-gray-100 py-0.5">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className={`flex items-center gap-1.5 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm border transition-all shrink-0 ${
              useLightNav
                ? "border-white/30 text-white hover:bg-white hover:text-[#1e3a5f]"
                : "border-[#1e3a5f]/25 text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
            }`}
          >
            Log In
          </Link>
        )}
      </div>
    </nav>
  );
}
