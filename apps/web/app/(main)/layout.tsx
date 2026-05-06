// The home/profile/login pages all read auth state in the navbar; if the
// SSR shell is cached at the CDN, every visitor sees the first user's
// session-derived markup until React hydrates. Force per-request rendering.
export const dynamic = 'force-dynamic'

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan Your Trip with AI — Travyl",
  description: "AI-powered collaborative travel planning. Build itineraries, discover places, and plan trips with friends.",
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="pt-16 bg-background text-foreground transition-colors duration-500">{children}</main>
  );
}
