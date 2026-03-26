export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="pt-16 bg-background text-foreground transition-colors duration-500">{children}</main>
  );
}
