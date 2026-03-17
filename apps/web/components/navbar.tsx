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
  const signOut = useAuthStore((s) => s.signOut);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // Track scroll position for navbar shrink
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDarkMode(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  // Close dropdown when clicking outside
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
        className={`${sizeClasses} flex items-center justify-center rounded-full overflow-hidden bg-[#1e3a5f] text-white font-medium`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName || "User"} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
    );
  };

  return (
    <nav
      className={`fixed left-1/2 -translate-x-1/2 z-50 rounded-full border border-white/20 backdrop-blur-xl shadow-lg shadow-black/[0.06] transition-all duration-500 ease-out ${
        scrolled
          ? "top-5 w-[calc(100%-3rem)] max-w-6xl bg-white/20"
          : "top-3 w-[calc(100%-2rem)] max-w-5xl bg-white/30"
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
          className={`flex items-center gap-0.5 sm:gap-1 text-[#1e3a5f] tracking-[1px] sm:tracking-[2px] transition-all duration-500 shrink-0 ${
            scrolled ? "text-lg sm:text-2xl" : "text-base sm:text-xl"
          }`}
          style={{ fontFamily: 'var(--font-brand)', fontWeight: 800 }}
        >
          <span className="hidden sm:inline">TRAVYL</span>
          <PaperPlane size={scrolled ? 28 : 24} className="transition-all duration-500" />
        </Link>

        {/* Center nav — always visible, compact on small screens */}
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
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f] font-semibold shadow-sm"
                  : "text-[#1e3a5f] border-[#1e3a5f]/25 hover:bg-[#1e3a5f]/5 hover:border-[#1e3a5f]/50"
              }`}
            >
              <Icon size={scrolled ? 16 : 14} className="shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>

        {/* Right side: avatar dropdown (logged in) or Login button */}
        {user ? (
          <div className="flex items-center shrink-0">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-[#1e3a5f]/20 transition-all"
              >
                <Avatar />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                  {/* User info header */}
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

                  {/* Menu items */}
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

                  {/* Theme toggle */}
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
            className="flex items-center gap-1.5 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm border border-[#1e3a5f]/25 text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-all shrink-0"
          >
            Log In
          </Link>
        )}

      </div>
    </nav>
  );
}
