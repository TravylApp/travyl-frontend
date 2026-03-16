import { MonthStateProvider } from '@/contexts/MonthStateContext';
import { PaletteOpenProvider } from '@/contexts/PaletteOpenContext';
import { RealtimeTripsProvider } from '@/contexts/RealtimeTripsContext';
import { TripsTopBar } from '@/components/trips/TripsTopBar';
import { TripCommandPalette } from '@/components/trips/TripCommandPalette';

export default function TripsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MonthStateProvider>
      <PaletteOpenProvider>
        <RealtimeTripsProvider>
          <TripsTopBar />
          <TripCommandPalette />
          <main className="pt-12">{children}</main>
        </RealtimeTripsProvider>
      </PaletteOpenProvider>
    </MonthStateProvider>
  );
}
