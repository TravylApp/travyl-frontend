"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Luggage, User, Settings, LogOut, Sun, Moon, Menu, X, Share2 } from "lucide-react";
import { PaperPlane } from "@/components/icons/PaperPlane";
import { PlaceholderAvatar } from "@/components/ui/PlaceholderAvatar";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuthStore, useTrips, useProfile, useTrip, ensureShareLinkToken, updateTripVisibility, supabase } from "@travyl/shared";

const baseNavLinks = [
  { href: "/places", label: "Explore", icon: MapPin },
  { href: "/trips", label: "Trips", icon: Luggage },
];

const AUTH_PAGES = ["/login", "/signup"];

export default function GlobalNavbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: trips } = useTrips();
  const { data: profile } = useProfile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkPermission, setLinkPermission] = useState<'viewer' | 'editor'>('viewer');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name;
  const email = user?.email;
  // Avatar priority: Supabase profile upload → Google OAuth photo → email-only sign-in shows initials.
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const hasTrips = !!user;

  const navLinks = user
    ? [...baseNavLinks, { href: "/profile", label: "Profile", icon: User }]
    : baseNavLinks;

  const visibleNavLinks = navLinks.filter(
    (link) => link.href !== "/trips" || hasTrips,
  );

  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isTripRoute = pathname.startsWith('/trip/');
  const isSharePage = pathname.startsWith('/trip/') && pathname.includes('/share/');
  const tripIdFromPath = !isSharePage && isTripRoute ? pathname.split('/')[2] : undefined;
  const { data: currentTrip } = useTrip(tripIdFromPath);
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

  const openShareModal = useCallback(async () => {
    if (!currentTrip?.id) return;
    setShareLink(null);
    setLinkCopied(false);
    setInviteEmail('');
    setInviteError(null);
    setInviteSuccess(null);
    setShareModalOpen(true);
    setShareBusy(true);
    try {
      const token = await ensureShareLinkToken(currentTrip.id);
      const url = `${window.location.origin}/trip/${currentTrip.id}/share/${token}`;
      setShareLink(url);
    } catch {
      setInviteError('Failed to generate share link');
    } finally {
      setShareBusy(false);
    }
  }, [currentTrip?.id]);

  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
  }, [shareLink]);

  const handleChangeLinkPermission = useCallback(async (permission: 'viewer' | 'editor') => {
    if (!currentTrip?.id) return;
    setLinkPermission(permission);
    try {
      await updateTripVisibility(currentTrip.id, currentTrip.visibility === 'private' ? 'link' : currentTrip.visibility, permission);
      const token = await ensureShareLinkToken(currentTrip.id);
      setShareLink(`${window.location.origin}/trip/${currentTrip.id}/share/${token}`);
    } catch {}
  }, [currentTrip?.id, currentTrip?.visibility]);

  const handleInvite = useCallback(async () => {
    if (!currentTrip?.id || !inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch('/api/calendar/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tripId: currentTrip.id, email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Invite failed (${res.status})`);
      setInviteSuccess(`Invited ${inviteEmail.trim()}`);
      setInviteEmail('');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  }, [currentTrip?.id, inviteEmail, inviteRole]);

  useEffect(() => {
    if (!shareModalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShareModalOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shareModalOpen]);

  const handleSignOut = useCallback(async () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
  }, [signOut]);

  if (isAuthPage) return null;

  return (
    <>
      {/* Inject navbar transition styles — shell/bar split for GPU-friendly animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Shell: fixed overlay, handles vertical offset with transform (compositor-only) */
        .gnav-shell {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          display: flex;
          justify-content: center;
          pointer-events: none;
          transform: translateY(0);
          will-change: transform;
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .gnav-shell.scrolled {
          transform: translateY(12px);
        }

        /* Bar: visual chrome — no height transition (avoids layout reflow) */
        .gnav-bar {
          width: 100%;
          max-width: 100%;
          height: 48px;
          border-radius: 0;
          pointer-events: auto;
          contain: layout style;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          box-shadow: 0 1px 0 rgba(0,0,0,0.04);
          will-change: max-width, border-radius;
          transition:
            max-width 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            border-radius 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            background 0.3s ease,
            box-shadow 0.3s ease,
            border-color 0.3s ease;
        }
        .gnav-shell.scrolled .gnav-bar {
          max-width: min(92%, 64rem);
          border-radius: 9999px;
          border-bottom-color: transparent;
        }

        /* Light mode backgrounds */
        .gnav-bar.bg-clear { background: rgba(255,255,255,0.30); }
        .gnav-bar.bg-clear-hero { background: rgba(255,255,255,0.05); box-shadow: 0 1px 0 rgba(255,255,255,0.06); }
        /* Solid bar — used on non-hero routes so trip/dashboard content doesn't bleed through */
        .gnav-bar.bg-solid { background: rgba(255,255,255,0.96); border-bottom: 1px solid rgba(0,0,0,0.06); }
        :root.dark .gnav-bar.bg-solid { background: rgba(10,21,32,0.96); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .gnav-shell.scrolled .gnav-bar.bg-clear {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06);
        }
        .gnav-shell.scrolled .gnav-bar.bg-clear-hero {
          background: rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        /* Dark mode backgrounds */
        :root.dark .gnav-bar.bg-clear { background: rgba(10,21,32,0.35); box-shadow: 0 1px 0 rgba(30,58,95,0.15); }
        :root.dark .gnav-shell.scrolled .gnav-bar.bg-clear {
          background: rgba(10,21,32,0.75);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04);
        }

        /* Inner container */
        .gnav-inner {
          max-width: 80rem;
          transition: max-width 0.3s ease-out;
        }
        .gnav-shell.scrolled .gnav-inner { max-width: 100%; }

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
          .gnav-bar { height: 48px; }
          .gnav-shell.scrolled { transform: translateY(8px); }
          .gnav-shell.scrolled .gnav-bar { max-width: min(95%, 64rem); height: 44px; }
        }
      ` }} />

      <div className={`gnav-shell ${scrolled && isHomePage ? "scrolled" : ""}`}>
      <nav className={`gnav-bar ${useLightNav ? "bg-clear-hero" : isHomePage ? "bg-clear" : "bg-solid"}`}>
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
            {visibleNavLinks.map(({ href, label, icon: Icon }) => (
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
            {/* Share button — trip pages only */}
            {tripIdFromPath && currentTrip && (
              <Tooltip content="Share this trip">
                <button
                  onClick={openShareModal}
                  aria-label="Share this trip"
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 mr-1.5 ${
                    useLightNav
                      ? "text-white/80 hover:text-white hover:bg-white/10"
                      : "text-[#1e3a5f]/60 dark:text-[#f5efe8]/60 hover:text-[#1e3a5f] dark:hover:text-[#f5efe8] hover:bg-[#1e3a5f]/5 dark:hover:bg-white/8"
                  }`}
                >
                  <Share2 size={14} />
                </button>
              </Tooltip>
            )}
            {/* Dark mode toggle */}
            <Tooltip content="Toggle dark mode">
              <button
                onClick={toggleTheme}
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 mr-2 ${
                  useLightNav
                    ? "text-white/80 hover:text-white hover:bg-white/10"
                    : "text-[#1e3a5f]/60 dark:text-[#f5efe8]/60 hover:text-[#1e3a5f] dark:hover:text-[#f5efe8] hover:bg-[#1e3a5f]/5 dark:hover:bg-white/8"
                }`}
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </Tooltip>
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="User menu"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  className="flex items-center rounded-full hover:ring-2 hover:ring-[#1e3a5f]/20 dark:hover:ring-white/20 transition-all"
                >
                  <PlaceholderAvatar
                    key={user?.id ?? 'anon'}
                    userId={user?.id}
                    name={displayName}
                    email={email}
                    avatarUrl={avatarUrl}
                    size={32}
                  />
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
                        <PlaceholderAvatar
                          key={user?.id ?? 'anon'}
                          userId={user?.id}
                          name={displayName}
                          email={email}
                          avatarUrl={avatarUrl}
                          size={32}
                        />
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

          {/* Mobile — hamburger */}
          <div className="flex sm:hidden items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className={`p-1.5 rounded-full transition-colors duration-300 ${
                useLightNav ? "text-white hover:bg-white/10" : "text-[#1e3a5f] dark:text-[#f5efe8] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>
      </div>

      {/* Mobile slide-down menu — outside shell so it doesn't inherit transform */}
      <div
        className={`gnav-mobile-menu fixed left-0 right-0 z-40 sm:hidden backdrop-blur-2xl ${mobileMenuOpen ? "open" : ""}`}
        style={{
          top: scrolled ? 60 : 48,
          background: isDarkMode ? "rgba(10,21,32,0.92)" : "rgba(255,255,255,0.92)",
          borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          boxShadow: mobileMenuOpen ? "0 16px 48px rgba(0,0,0,0.1)" : "none",
          transition: "max-height 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease, top 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="px-4 py-3 flex flex-col gap-1">
          {visibleNavLinks.map(({ href, label, icon: Icon }) => (
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
            {!user && (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <LogOut size={18} className="rotate-90" />
                Log In
              </Link>
            )}
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
      {shareModalOpen && currentTrip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setShareModalOpen(false)}>
          <div
            className="w-full max-w-md rounded-xl border p-5 shadow-2xl max-h-[90vh] overflow-y-auto mx-4"
            style={{
              background: isDarkMode ? '#0f1a28' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Share &ldquo;{currentTrip.title}&rdquo;
              </h2>
              <button onClick={() => setShareModalOpen(false)} className={`${isDarkMode ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'} transition-colors text-xl leading-none`}>
                &times;
              </button>
            </div>

            {/* Invite by email */}
            <div className="mb-4">
              <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                Invite by email
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@email.com"
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-white/30'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400'
                  }`}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor')}
                  className={`rounded-lg border px-2 py-2 text-sm outline-none ${
                    isDarkMode
                      ? 'bg-white/5 border-white/10 text-white/80'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <option value="viewer">Can view</option>
                  <option value="editor">Can edit</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail.trim()}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-white bg-[#1e3a5f] hover:bg-[#16304f] disabled:opacity-50 transition-colors"
                >
                  {isInviting ? '...' : 'Invite'}
                </button>
              </div>
              {inviteError && (
                <p className={`mt-1.5 text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className={`mt-1.5 text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{inviteSuccess}</p>
              )}
            </div>

            {/* Divider */}
            <div className={`border-t my-4 ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`} />

            {/* Share link */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                Share link
              </label>
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={linkPermission}
                  onChange={(e) => handleChangeLinkPermission(e.target.value as 'viewer' | 'editor')}
                  className={`rounded-lg border px-2 py-2 text-sm outline-none ${
                    isDarkMode
                      ? 'bg-white/5 border-white/10 text-white/80'
                      : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <option value="viewer">Can view</option>
                  <option value="editor">Can edit</option>
                </select>
                <button
                  onClick={handleCopyLink}
                  disabled={!shareLink || shareBusy}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    linkCopied
                      ? 'bg-green-500/20 text-green-600'
                      : isDarkMode
                        ? 'bg-white/10 text-white hover:bg-white/15'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {shareBusy ? 'Generating...' : linkCopied ? 'Copied!' : 'Copy share link'}
                </button>
              </div>
              {shareLink && (
                <p className={`text-xs truncate ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>
                  {shareLink}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
