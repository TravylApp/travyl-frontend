'use client';

import { use } from 'react';
import { useAuthStore, useProfile } from '@travyl/shared';
import { CalendarShell } from '@/components/calendar/CalendarShell';
import { YjsTripProvider } from '@/components/calendar/providers/YjsTripProvider';

export default function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile();

  return (
    <YjsTripProvider tripId={id}>
      <CalendarShell
        tripId={id}
        userId={user?.id ?? 'anonymous'}
        userName={profile?.display_name ?? user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email ?? 'Guest'}
        userAvatarUrl={profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null}
      />
    </YjsTripProvider>
  );
}
