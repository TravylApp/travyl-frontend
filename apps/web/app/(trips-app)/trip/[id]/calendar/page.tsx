'use client';

import { use } from 'react';
import { useAuthStore } from '@travyl/shared';
import { CalendarDashboard } from '@/components/calendar/CalendarDashboard';
import { YjsTripProvider } from '@/components/calendar/providers/YjsTripProvider';

export default function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useAuthStore((s) => s.user);

  return (
    <YjsTripProvider tripId={id}>
      <CalendarDashboard
        tripId={id}
        userId={user?.id ?? 'anonymous'}
        userName={user?.user_metadata?.full_name ?? user?.email ?? 'Guest'}
      />
    </YjsTripProvider>
  );
}
