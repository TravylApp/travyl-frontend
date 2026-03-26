export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-16 bg-background text-foreground">{children}</main>
  )
}
