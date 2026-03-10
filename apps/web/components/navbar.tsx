"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Luggage, User, Settings, LogOut, HelpCircle, FileText, Sun, Moon, Search, ChevronDown, Heart, Compass, ShoppingBag } from "lucide-react";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { useAuthStore } from "@travyl/shared";

const navDropdowns = [
  {
    label: "Explore",
    icon: Compass,
    items: [
      { label: "Destinations", href: "/explore" },
      { label: "Popular Trips", href: "/explore?sort=popular" },
      { label: "Nearby", href: "/explore?nearby=true" },
    ],
  },
  {
    label: "Saved",
    icon: Heart,
    items: [
      { label: "Favorite Places", href: "/favorites" },
      { label: "Saved Trips", href: "/trips?saved=true" },
    ],
  },
  {
    label: "Shop",
    icon: ShoppingBag,
    items: [
      { label: "Travel Gear", href: "/shop" },
      { label: "Gift Cards", href: "/gift" },
    ],
  },
];

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name;
  const email = user?.email;
  const initials = getInitials(displayName);

  // Track scroll position for navbar shrinking
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
        setActiveDropdown(null);
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
    const sizeClasses = size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm";
    return (
      <div
        className={`${sizeClasses} flex items-center justify-center rounded-full overflow-hidden bg-[#374151] text-white font-medium transition-all duration-500`}
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
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 right-0 left-0 z-50 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isScrolled
          ? "bg-white/80 border-b border-white/20 shadow-sm"
          : "bg-white/30 border-b border-transparent"
      }`}
    >
      <div className={`mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 max-w-7xl`}>
        {/* Left side: Logo + Nav dropdowns */}
        <div className={`flex items-center transition-all duration-500 ${
          isScrolled ? "gap-6 lg:gap-8" : "gap-8 lg:gap-12"
        }`}>
          <Link
            href="/"
            className="flex items-center gap-2 group"
          >
            <motion.div
              whileHover={{ rotate: -15 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="transition-transform duration-500"
              style={{ transform: isScrolled ? "scale(0.75)" : "scale(1)" }}
            >
              <PaperPlane size={24} className="-rotate-12 text-[#374151] transition-all duration-500" />
            </motion.div>
            <span className={`font-bold text-[#374151] group-hover:text-[#374151]/80 transition-all duration-500 ${
              isScrolled ? "text-base tracking-normal" : "text-xl tracking-wide"
            }`} style={{ fontFamily: "'Satoshi', sans-serif" }}>Travyl</span>
          </Link>

          {/* Nav dropdowns - Desktop */}
          <div className={`hidden md:flex items-center transition-all duration-500 ${
            isScrolled ? "gap-1" : "gap-2"
          }`} ref={dropdownRef}>
            {navDropdowns.map((dropdown) => (
              <div
                key={dropdown.label}
                className="relative"
                onMouseEnter={() => setActiveDropdown(dropdown.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all duration-500 ${
                    isScrolled ? "text-sm" : "text-base"
                  } ${
                    activeDropdown === dropdown.label
                      ? "text-[#374151]"
                      : "text-gray-600 hover:text-[#374151]"
                  }`}
                >
                  {dropdown.label}
                  <ChevronDown size={isScrolled ? 14 : 16} className={`transition-transform duration-200 ${activeDropdown === dropdown.label ? "rotate-180" : ""}`} />
                </button>

                {activeDropdown === dropdown.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50"
                  >
                    {dropdown.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-[#F59E0B]/10 hover:text-[#374151] transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right side: Avatar with dropdown or Login button */}
        {user ? (
          <div className={`hidden md:flex items-center transition-all duration-500 ${
            isScrolled ? "gap-3" : "gap-4"
          }`}>
            <Link
              href="/trips"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold bg-[#F59E0B] text-white hover:bg-[#F59E0B]/90 transition-all duration-500 hover:shadow-lg hover:shadow-[#F59E0B]/25 ${
                isScrolled ? "text-sm" : "text-base"
              }`}
            >
              <Luggage size={isScrolled ? 14 : 16} className="transition-all duration-500" />
              My Trips
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-gray-200 transition-all"
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
                          isDarkMode ? "bg-[#374151]" : "bg-gray-200"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
                            isDarkMode ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        >
                          {isDarkMode ? (
                            <Moon size={10} className="text-[#374151]" />
                          ) : (
                            <Sun size={10} className="text-amber-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 py-0.5">
                    <a
                      href="#"
                      className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FileText size={15} className="text-gray-400" />
                      Documentation
                    </a>
                    <a
                      href="#"
                      className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <HelpCircle size={15} className="text-gray-400" />
                      Support
                    </a>
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
            className={`hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold bg-[#F59E0B] text-white hover:bg-[#F59E0B]/90 transition-all duration-500 hover:shadow-lg hover:shadow-[#F59E0B]/25 ${
              isScrolled ? "text-sm" : "text-base"
            }`}
          >
            Get started
          </Link>
        )}

        {/* Mobile: Menu button */}
        <button
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600"
          onClick={() => {/* TODO: Mobile menu */}}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </motion.nav>
  );
}
