'use client';

import type { ActivityViewModel } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { useHomeCurrency } from '@travyl/shared';
import { ActivityCard } from './ActivityCard';
import { CompactActivityCard } from './CompactActivityCard';
import { MinimalActivityCard } from './MinimalActivityCard';
import { ListActivityCard } from './ListActivityCard';
import { ItineraryPinCard } from './ItineraryPinCard';

export type CardStyle = 'legacy' | 'compact' | 'minimal' | 'list' | 'pin';

const ACTIVITY_IMAGES: Record<string, string[]> = {};

/**
 * Name-based fallback images for activities that don't have photos from
 * the DB or enrichment pipeline. Keyed by normalized (lowercased/trimmed)
 * activity name. Add entries here when specific activities need images.
 */
const NAME_IMAGES: Record<string, string[]> = {
  'the pig & pint': [
    'https://img02.restaurantguru.com/cedb-BBQ-The-Pig-and-Pint-exterior.jpg',
    'https://img02.restaurantguru.com/cd3c-Restaurant-The-Pig-and-Pint-food-2.jpg',
  ],
  'boondocks': [
    'https://www.visitjackson.com/imager/cmsimages/4122271/Boondocks-BBQ-plate-with-brisket-and-chicken-fries-and-beans_91852798b59be8b28fc00edfe4aec23a.jpg',
  ],
  'defy jackson': [
    'https://defy.com/wp-content/uploads/2021/11/social-grid-image-1.jpg',
  ],
};

/** Normalize an activity name for lookup: lowercase, trimmed, common suffixes removed. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Look up fallback images by activity name. Returns null if no match. */
export function lookupActivityImage(name: string): string | null {
  const key = normalizeName(name);
  // Exact match first
  if (NAME_IMAGES[key]?.[0]) return NAME_IMAGES[key][0];
  // Substring match — e.g. "The Pig & Pint - Jackson" matches "the pig & pint"
  for (const [k, v] of Object.entries(NAME_IMAGES)) {
    if (key.includes(k) || k.includes(key)) return v[0];
  }
  return null;
}

function activityToDiscoverItem(activity: ActivityViewModel, images: string[]): DiscoverItem {
  const actImg = activity.image ? [activity.image] : [];
  const idFallback = ACTIVITY_IMAGES[activity.id];
  const nameFallback = lookupActivityImage(activity.name);
  const nameFallbackArray = nameFallback ? [nameFallback] : [];
  const fallbacks = idFallback && idFallback.length > 0 ? idFallback : nameFallbackArray;
  const imgs = images.length > 0 ? images : actImg.length > 0 ? actImg : fallbacks;
  return {
    id: activity.id,
    name: activity.name,
    location: activity.locationName || '',
    description: activity.notes || `${activity.category} activity`,
    images: imgs,
    rating: 4.5,
    tags: [activity.category, activity.costDisplay || ''].filter(Boolean),
    price: activity.costDisplay || undefined,
    category: activity.category,
    isBooked: true,
    bookedTime: activity.startTime || undefined,
  };
}

interface ActivityCardRendererProps {
  activity: ActivityViewModel;
  cardStyle: CardStyle;
  images?: string[];
  rating?: number;
  index?: number;
  accentColor?: string;
  onClick?: () => void;
  onFavorite?: () => void;
  isFavorited?: boolean;
  onAddToItinerary?: (id: string) => void;
  onRemoveFromItinerary?: (id: string) => void;
}

export function ActivityCardRenderer({
  activity,
  cardStyle,
  images = [],
  rating,
  index = 0,
  accentColor = 'var(--trip-base)',
  onClick,
  onFavorite,
  isFavorited = false,
  onAddToItinerary,
  onRemoveFromItinerary,
}: ActivityCardRendererProps) {
  const { format: formatHome } = useHomeCurrency();
  const costDisplay = activity.cost != null
    ? formatHome(activity.cost, activity.costCurrency ?? undefined)
    : activity.costDisplay;
  const activityWithHomeCost = { ...activity, costDisplay };

  // Merge name-based fallback images into the images array for card styles
  // that don't read activity.image directly (compact, minimal, list).
  const effectiveImages = images.length > 0 ? images
    : activity.image ? [activity.image]
    : (() => {
        const nf = lookupActivityImage(activity.name);
        return nf ? [nf] : [];
      })();

  switch (cardStyle) {
    case 'pin':
      return (
        <ItineraryPinCard
          item={activityToDiscoverItem(activityWithHomeCost, images)}
          index={index}
          accentColor={accentColor}
          isFavorited={isFavorited}
          onFavorite={onFavorite ? () => onFavorite() : () => {}}
          onClick={onClick}
          onAddToItinerary={onAddToItinerary}
          onRemoveFromItinerary={onRemoveFromItinerary}
          flat
        />
      );
    case 'compact':
      return (
        <CompactActivityCard
          activity={activityWithHomeCost}
          images={effectiveImages}
          rating={rating}
          onClick={onClick}
          onFavorite={onFavorite}
          isFavorited={isFavorited}
        />
      );
    case 'minimal':
      return (
        <MinimalActivityCard
          activity={activityWithHomeCost}
          images={effectiveImages}
          rating={rating}
          onClick={onClick}
          onFavorite={onFavorite}
          isFavorited={isFavorited}
        />
      );
    case 'list':
      return (
        <ListActivityCard
          activity={activityWithHomeCost}
          images={effectiveImages}
          rating={rating}
          onClick={onClick}
          onFavorite={onFavorite}
          isFavorited={isFavorited}
        />
      );
    case 'legacy':
    default:
      return <ActivityCard activity={activityWithHomeCost} onClick={onClick} />;
  }
}
