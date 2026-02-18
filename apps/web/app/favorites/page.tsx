"use client";

import Link from "next/link";
import { useAuthStore, useSavedItems } from "@travyl/shared";

export default function FavoritesPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const { data: savedItems, isLoading } = useSavedItems();

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
        <span className="text-4xl">❤️</span>
        <h1 className="mt-4 text-xl font-bold text-foreground">Sign in to see your favorites</h1>
        <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
          Save places you love across trips.
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

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading favorites…</p>
      </div>
    );
  }

  if (!savedItems?.length) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <h1 className="text-2xl font-semibold text-muted-foreground">Save places you love across trips</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold mb-6">Favorites</h1>
      <div className="grid gap-4">
        {savedItems.map((item) => (
          <div key={item.id} className="rounded-xl border p-4">
            <p className="text-sm font-medium">{item.item_type}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.item_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
