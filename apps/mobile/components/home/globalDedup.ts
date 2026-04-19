/**
 * Global deduplication for the home page.
 * All sections (DiscoveryFeed, GetInspired, TravelMosaic) use this
 * so no place appears in more than one section per session.
 */

import { upscaleGoogleImage, type PlaceItem } from '@travyl/shared';

const seenIds = new Set<string>();
const seenNames = new Set<string>();

export function isDuplicate(id: string, name: string): boolean {
  const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return seenIds.has(id) || seenNames.has(norm);
}

export function markSeen(id: string, name: string): void {
  seenIds.add(id);
  seenNames.add(name.toLowerCase().replace(/[^a-z0-9]/g, ''));
}

/**
 * Filter out places without name/image, deduplicate globally, and upscale images.
 * Use this instead of copy-pasting the filter+dedup+upscale pipeline.
 */
export function filterAndUpscalePlaces(raw: PlaceItem[]): PlaceItem[] {
  return raw.filter(p => {
    if (!p.name || !p.image) return false;
    if (isDuplicate(p.id, p.name)) return false;
    markSeen(p.id, p.name);
    return true;
  }).map(p => ({
    ...p,
    image: upscaleGoogleImage(p.image) || p.image,
  }));
}
