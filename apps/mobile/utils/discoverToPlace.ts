import type { DiscoverItem, PlaceItem } from '@travyl/shared';

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
    type: 'attraction',
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
