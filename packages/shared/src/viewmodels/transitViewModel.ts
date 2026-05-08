import type { TransitSegment, VehicleType } from '../types';

export interface TransitViewModel {
  id: string;
  vehicleType: VehicleType;
  provider: string | null;
  routeName: string | null;
  route: string;
  originLabel: string;
  destinationLabel: string;
  departureAt: string | null;
  arrivalAt: string | null;
  departureDisplay: string;
  arrivalDisplay: string;
  price: number | null;
  currency: string;
  bookingRef: string | null;
  confirmationCode: string | null;
  notes: string | null;
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function buildTransitViewModel(segment: TransitSegment): TransitViewModel {
  const d = segment.data;
  return {
    id: segment.id,
    vehicleType: d.vehicleType,
    provider: d.provider,
    routeName: d.routeName,
    route: `${d.originLabel} → ${d.destinationLabel}`,
    originLabel: d.originLabel,
    destinationLabel: d.destinationLabel,
    departureAt: d.departureAt,
    arrivalAt: d.arrivalAt,
    departureDisplay: fmtTime(d.departureAt),
    arrivalDisplay: fmtTime(d.arrivalAt),
    price: d.price,
    currency: d.currency,
    bookingRef: d.bookingRef,
    confirmationCode: d.confirmationCode,
    notes: d.notes,
  };
}
