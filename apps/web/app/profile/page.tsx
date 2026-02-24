"use client";

import Link from "next/link";
import { useAuthStore, useProfile, useTrips, useSavedItems } from "@travyl/shared";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: profile } = useProfile();
  const { data: trips } = useTrips();
  const { data: savedItems } = useSavedItems();

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <span className="text-3xl text-muted-foreground">?</span>
        </div>
        <h1 className="mt-6 text-xl font-bold text-foreground">Sign in to view your profile</h1>
        <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
          Create an account to save trips, track favorites, and sync across devices.
        </p>
        <Link
          href="/login"
          className="mt-8 flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {/* Avatar & Info */}
      <div className="flex flex-col items-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary">
          <span className="text-3xl font-bold text-white">{initials}</span>
        </div>
        <h1 className="mt-4 text-xl font-bold text-foreground">{displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

        {/* Stats Row */}
        <div className="mt-6 flex gap-12">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{trips?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Trips</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{savedItems?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Favorites</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-10 space-y-2">
        <Link
          href="/profile/settings"
          className="flex h-14 items-center justify-between rounded-xl bg-muted px-4 transition-colors hover:bg-muted/70"
        >
          <span className="text-foreground">Settings</span>
          <span className="text-muted-foreground">&rsaquo;</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
