import TripTabs from "@/components/trip-tabs";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-7xl">
      <TripTabs tripId={id} />
      <div className="px-6 py-8">{children}</div>
    </div>
  );
}
