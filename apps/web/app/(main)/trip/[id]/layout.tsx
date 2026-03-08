import TripLayoutInner from "./trip-layout-inner";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TripLayoutInner tripId={id}>{children}</TripLayoutInner>;
}
