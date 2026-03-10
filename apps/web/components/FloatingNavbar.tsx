"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Compass, Heart, ShoppingBag, ChevronDown, User, Settings, LogOut, Sun, Moon, FileText, HelpCircle, Luggage } from "lucide-react";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { useAuthStore } from "@travyl/shared";

const navLinks = [
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

export function FloatingNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name;
  const email = user?.email;
  const initials = getInitials(displayName);

  // Track scroll for navbar shrinking
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
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
        setUserMenuOpen(false);
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
    setUserMenuOpen(false);
    await signOut();
  };

  const Avatar = ({ size = "md" }: { size?: "md" | "sm" }) => {
    const sizeClasses = size === "sm" ? "h-6 w-6 text-[10px]" : (scrolled ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-xs");
    return (
      <div
        className={`${sizeClasses} flex items-center justify-center rounded-full overflow-hidden bg-white/20 text-white font-medium ring-2 ring-white/30 transition-all duration-300`}
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
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-16 right-16 md:left-24 md:right-24 z-50"
      style={{ top: scrolled ? 6 : 16 }}
    >
      <motion.div
        animate={{ paddingLeft: scrolled ? 16 : 24, paddingRight: scrolled ? 16 : 24 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`
          mx-auto
          rounded-full
          backdrop-blur-xl
          transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${scrolled ? "bg-[#1e3a5f]/50 shadow-lg shadow-black/10 max-w-7xl" : "bg-[#1e3a5f]/30"}
        `}
        style={{ borderRadius: "1000px", transformOrigin: "center" }}
      >
        <div
          className={`flex items-center justify-between h-12`}
        >
          {/* Left: Logo */}
          <motion.div
            animate={{ x: scrolled ? 8 : 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <motion.div
                whileHover={{ rotate: -15 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="transition-transform duration-300"
                style={{ transform: scrolled ? "scale(0.85)" : "scale(1)" }}
              >
                <PaperPlane size={scrolled ? 16 : 20} className="-rotate-12 text-[#F59E0B] transition-all duration-300" />
              </motion.div>
              <span className={`font-bold text-white group-hover:text-white/80 transition-all duration-300 ${
                scrolled ? "text-sm" : "text-base"
              }`} style={{ fontFamily: "'Satoshi', sans-serif" }}>
                Travyl
              </span>
            </Link>
          </motion.div>

          {/* Center: Nav Links (desktop) */}
          <motion.div
            animate={{ gap: scrolled ? 0 : 4 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:flex items-center"
            style={{ gap: scrolled ? 0 : 4 }}
            ref={dropdownRef}
          >
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => setActiveDropdown(link.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 rounded-full font-medium transition-all ${
                    scrolled ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-base"
                  } ${
                    activeDropdown === link.label
                      ? "text-white bg-white/10"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                  <ChevronDown
                    size={scrolled ? 14 : 16}
                    className={`transition-all duration-300 ${
                      activeDropdown === link.label ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {activeDropdown === link.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50"
                    >
                      {link.items.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-[#F59E0B]/10 hover:text-[#1e3a5f] transition-colors"
                          onClick={() => setActiveDropdown(null)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>

          {/* Right: User Menu or CTA */}
          <motion.div
            animate={{ x: scrolled ? -8 : 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
          {loading ? (
            <div className={`rounded-full bg-white/10 animate-pulse ${
              scrolled ? "h-6 w-16" : "h-7 w-20"
            }`} />
          ) : user ? (
            <div className="flex items-center gap-2">
              {/* My Trips button */}
              <Link
                href="/trips"
                className={`hidden sm:flex items-center gap-1.5 rounded-full font-semibold bg-[#F59E0B] text-white hover:bg-[#F59E0B]/90 transition-all duration-300 ${
                  scrolled ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
                }`}
              >
                <Luggage size={scrolled ? 10 : 12} className="transition-all duration-300" />
                My Trips
              </Link>

              {/* User avatar with dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center rounded-full hover:ring-2 hover:ring-white/20 transition-all"
                >
                  <Avatar />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50"
                    >
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
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User size={15} className="text-gray-400" />
                          Your Profile
                        </Link>
                        <Link
                          href="/profile/settings"
                          onClick={() => setUserMenuOpen(false)}
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
                            {isDarkMode ? (
                              <Moon size={15} className="text-gray-400" />
                            ) : (
                              <Sun size={15} className="text-gray-400" />
                            )}
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
                                <Sun size={10} className="text-[#F59E0B]" />
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className={`flex items-center gap-1 rounded-full font-semibold bg-[#F59E0B] text-white hover:bg-[#F59E0B]/90 transition-all duration-300 hover:shadow-lg hover:shadow-[#F59E0B]/25 ${
                scrolled ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"
              }`}
            >
              Get started
            </Link>
          )}
          </motion.div>
        </div>
      </motion.div>
    </motion.nav>
  );
}
