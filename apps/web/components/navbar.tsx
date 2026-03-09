"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MapPin, Luggage, User } from "lucide-react";
import { PaperPlane } from "@/components/icons/PaperPlane";

const navLinks = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/favorites", label: "Places", icon: MapPin },
  { href: "/trips", label: "Trips", icon: Luggage },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-11 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[#1e3a5f] font-black text-xl tracking-[1.5px]"
        >
          TRAVYL
          <PaperPlane size={16} className="-rotate-12" />
        </Link>

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

        {/* Login button (desktop) */}
        <Link
          href="/login"
          className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm border border-[#1e3a5f]/25 text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-all"
        >
          Log In
        </Link>

        {/* Mobile: profile avatar */}
        <Link
          href="/profile"
          className={`md:hidden flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
            pathname.startsWith("/profile")
              ? "bg-[#1e3a5f] text-white"
              : "bg-gray-100 text-gray-600 hover:text-gray-900"
          }`}
        >
          U
        </Link>
      </div>
    </nav>
  );
}
