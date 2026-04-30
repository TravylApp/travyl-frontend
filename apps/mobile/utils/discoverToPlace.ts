import type { DiscoverItem, PlaceItem } from '@travyl/shared';

// The PlaceItem.type union is the contract. If the backend `category`
// already names one of those values, pass it through; otherwise fall
// back to 'attraction'. This isn't a curated lookup table — it's just
// type narrowing on the union itself.
const PLACE_TYPES: PlaceItem['type'][] = [
  'destination', 'attraction', 'restaurant', 'experience', 'event', 'hotel',
];
function resolveType(category: string | undefined): PlaceItem['type'] {
  const c = (category ?? '').toLowerCase();
  return (PLACE_TYPES.find((t) => t === c)) ?? 'attraction';
}

/**
 * Convert a DiscoverItem into a PlaceItem so it can be used
 * with the shared PlaceDetailModal / CardFront / CardBack components.
 */
export function discoverItemToPlaceItem(item: DiscoverItem): PlaceItem {
  return {
    id: item.id,
    name: item.name,
    image: item.images[0] ?? '',
    images: item.images,
    type: resolveType(item.category),
    rating: item.rating,
    tagline: item.location,
    category: item.category ?? 'Activity',
    description: item.description,
    tags: item.tags,
    latitude: item.lat,
    longitude: item.lng,
    reviewCount: item.reviewCount ?? item.reviews,
    duration: item.duration,
    admissionFee: item.price,
    website: item.bookingUrl,
    hours: item.hours,
    tips: item.highlights,
    accessibility: item.accessibility ? [item.accessibility] : undefined,
  };
}
