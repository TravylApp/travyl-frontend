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

function activityToDiscoverItem(activity: ActivityViewModel, images: string[]): DiscoverItem {
  const actImg = activity.image ? [activity.image] : [];
  const imgs = images.length > 0 ? images : actImg.length > 0 ? actImg : (ACTIVITY_IMAGES[activity.id] || []);
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
          images={images}
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
          images={images}
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
          images={images}
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
