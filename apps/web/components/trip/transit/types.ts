import type { TransitData } from '@travyl/shared';

export interface TransitCardViewModel {
  id: string;
  vehicleType: string;
  provider: string | null;
  routeName: string | null;
  origin: string;
  destination: string;
  departureAt: string | null;
  arrivalAt: string | null;
  departureDisplay: string | null;
  arrivalDisplay: string | null;
  bookingRef: string | null;
  price: number | null;
  currency: string;
}

export function buildTransitCardViewModel(data: TransitData): TransitCardViewModel {
  return {
    id: '',
    vehicleType: data.vehicleType,
    provider: data.provider,
    routeName: data.routeName,
    origin: data.originLabel,
    destination: data.destinationLabel,
    departureAt: data.departureAt,
    arrivalAt: data.arrivalAt,
    departureDisplay: data.departureAt
      ? new Date(data.departureAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null,
    arrivalDisplay: data.arrivalAt
      ? new Date(data.arrivalAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null,
    bookingRef: data.bookingRef,
    price: data.price,
    currency: data.currency,
  };
}
