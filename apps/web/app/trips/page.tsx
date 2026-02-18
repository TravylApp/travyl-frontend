"use client";

import Link from "next/link";
import { useAuthStore, useTrips } from "@travyl/shared";

export default function MyTripsPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const { data: trips, isLoading } = useTrips();

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
        <span className="text-4xl">✈️</span>
        <h1 className="mt-4 text-xl font-bold text-foreground">Sign in to see your trips</h1>
        <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
          Create an account to plan trips and access them anywhere.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="flex h-11 items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading trips…</p>
      </div>
    );
  }

  if (!trips?.length) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center">
        <span className="text-4xl">🗺️</span>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">My Trips</h1>
        <p className="mt-2 text-muted-foreground">No trips yet. Start planning!</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold mb-6">My Trips</h1>
      <div className="grid gap-4">
        {trips.map((trip) => (
          <Link
            key={trip.id}
            href={`/trip/${trip.id}`}
            className="block rounded-xl border p-4 hover:bg-muted/50 transition-colors"
          >
            <h2 className="text-lg font-semibold">{trip.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{trip.destination}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
