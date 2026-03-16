import { WeekStateProvider } from '@/contexts/WeekStateContext';
import { PaletteOpenProvider } from '@/contexts/PaletteOpenContext';
import { RealtimeTripsProvider } from '@/contexts/RealtimeTripsContext';
import { TripsTopBar } from '@/components/trips/TripsTopBar';
import { TripCommandPalette } from '@/components/trips/TripCommandPalette';

export default function TripsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WeekStateProvider>
      <PaletteOpenProvider>
        <RealtimeTripsProvider>
          <TripsTopBar />
          <TripCommandPalette />
          <main className="pt-12">{children}</main>
        </RealtimeTripsProvider>
      </PaletteOpenProvider>
    </WeekStateProvider>
  );
}
