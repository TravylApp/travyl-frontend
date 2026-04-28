// The home/profile/login pages all read auth state in the navbar; if the
// SSR shell is cached at the CDN, every visitor sees the first user's
// session-derived markup until React hydrates. Force per-request rendering.
export const dynamic = 'force-dynamic'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="pt-16 bg-background text-foreground transition-colors duration-500">{children}</main>
  );
}
