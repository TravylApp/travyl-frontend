"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, Luggage, User, Settings, LogOut, HelpCircle, FileText, Sun, Moon, Search } from "lucide-react";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { useAuthStore } from "@travyl/shared";

const navLinks = [
  { href: "/favorites", label: "Places", icon: MapPin },
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // On trips page, sync search with URL params
  const isTripsPage = pathname === '/trips' || pathname.startsWith('/trips?');
  const urlSearch = searchParams.get('search') || '';
  const [localSearch, setLocalSearch] = useState(urlSearch);

  // Keep local state in sync with URL when navigating
  useEffect(() => {
    setLocalSearch(urlSearch);
  }, [urlSearch]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (isTripsPage) {
      // Update URL params for trips page
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      const newUrl = params.toString() ? `/trips?${params.toString()}` : '/trips';
      router.replace(newUrl, { scroll: false });
    }
  };

  const searchQuery = isTripsPage ? urlSearch : localSearch;

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name;
  const email = user?.email;
  const initials = getInitials(displayName);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

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

  // Ctrl+K shortcut to focus search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape" && searchFocused) {
        searchInputRef.current?.blur();
        handleSearchChange("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchFocused]);

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
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-11 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo - links to home/dashboard */}
        {pathname === "/" ? (
          <Link
            href="/"
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <PaperPlane size={20} className="-rotate-12 text-[#1e3a5f]" />
            <span className="text-lg font-bold text-[#1e3a5f]">TRAVYL</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90 transition-colors"
          >
            <PaperPlane size={16} className="-rotate-12" />
          </Link>
        )}

        {/* Center nav (desktop) */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-1.5 rounded-full text-sm border flex items-center gap-1.5 transition-all ${
                isActive(href)
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f] font-semibold shadow-sm"
                  : "text-[#1e3a5f] border-[#1e3a5f]/25 hover:bg-[#1e3a5f]/5 hover:border-[#1e3a5f]/50"
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop: Search + Trips + Avatar with dropdown or Login button */}
        {user ? (
          <div className="hidden md:flex items-center gap-3">
            {/* Search bar */}
            <div className="relative">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                searchFocused
                  ? "border-[#1e3a5f] bg-white shadow-sm ring-2 ring-[#1e3a5f]/10"
                  : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
              }`}>
                <Search size={12} className={searchFocused ? "text-[#1e3a5f]" : "text-gray-400"} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={isTripsPage ? localSearch : searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder={isTripsPage ? "Search trips..." : "Search..."}
                  className={`${isTripsPage ? 'w-32 lg:w-48' : 'w-16 lg:w-24'} bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none`}
                />
                <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#1e3a5f]/70 bg-[#1e3a5f]/10 border border-[#1e3a5f]/20">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Trips button */}
            <Link
              href="/trips"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                isActive("/trips")
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f] font-semibold shadow-sm"
                  : "text-[#1e3a5f] border-[#1e3a5f]/25 hover:bg-[#1e3a5f]/5 hover:border-[#1e3a5f]/50"
              }`}
            >
              <Luggage size={14} />
              Trips
            </Link>

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
                    {/* Toggle switch */}
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
            className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm border border-[#1e3a5f]/25 text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-all"
          >
            Log In
          </Link>
        )}

        {/* Mobile: profile avatar */}
        <Link
          href="/profile"
          className={`md:hidden flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium overflow-hidden transition-colors ${
            pathname.startsWith("/profile")
              ? "bg-[#1e3a5f] text-white"
              : "bg-gray-100 text-gray-600 hover:text-gray-900"
          }`}
        >
          {user && avatarUrl ? (
            <img src={avatarUrl} alt={displayName || "User"} className="h-full w-full object-cover" />
          ) : (
            user ? initials : "U"
          )}
        </Link>
      </div>
    </nav>
  );
}
