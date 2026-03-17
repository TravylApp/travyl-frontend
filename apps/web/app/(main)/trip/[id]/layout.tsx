export default function TripLayout({
  children,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  return <>{children}</>
}
