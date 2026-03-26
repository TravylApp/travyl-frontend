import { redirect } from 'next/navigation';

export default async function RestaurantsRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/trip/${id}/activities`);
}
