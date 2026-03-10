"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { User, Settings, LogOut, Sun, Moon, FileText, HelpCircle, Search } from "lucide-react";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { useAuthStore } from "@travyl/shared";

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function DashboardNavbar() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name;
  const email = user?.email;
  const initials = getInitials(displayName);

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
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut for search (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
    const sizeClasses = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
    return (
      <div
        className={`${sizeClasses} flex items-center justify-center rounded-full overflow-hidden bg-[#1e3a5f] text-white font-medium ring-2 ring-white shadow-sm transition-all duration-200 hover:ring-[#F59E0B]/50`}
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
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 h-11 bg-white border-b border-gray-200"
      >
        <div className="h-full px-4 flex items-center justify-between max-w-full">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <motion.div
              whileHover={{ rotate: -15 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <PaperPlane size={18} className="-rotate-12 text-[#1e3a5f] group-hover:text-[#F59E0B] transition-colors" />
            </motion.div>
            <span
              className="font-bold text-[#1e3a5f] group-hover:text-[#F59E0B] transition-colors text-sm"
              style={{ fontFamily: "'Satoshi', sans-serif" }}
            >
              Travyl
            </span>
          </Link>

          {/* Right: Search + Avatar */}
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <button
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 transition-colors group"
            >
              <Search size={14} className="text-gray-400 group-hover:text-gray-500" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-400 font-medium shadow-sm">
                <span className="text-[9px]">⌘</span>K
              </kbd>
            </button>

            {/* Avatar with dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center rounded-full hover:ring-2 hover:ring-[#F59E0B]/30 transition-all"
              >
                <Avatar />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50"
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
        </div>
      </motion.nav>

      {/* Search Modal */}
      <AnimatePresence>
        {searchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
            />

            {/* Search Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[70]"
            >
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                  <Search size={18} className="text-gray-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search trips, destinations, activities..."
                    className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
                  />
                  <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs text-gray-400 font-medium">
                    ESC
                  </kbd>
                </div>

                {/* Search Results */}
                <div className="max-h-80 overflow-y-auto">
                  {searchQuery.trim() === "" ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                      Start typing to search...
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↑</kbd>
                      <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↓</kbd>
                      to navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↵</kbd>
                      to select
                    </span>
                  </div>
                  <span>Powered by Travyl</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
