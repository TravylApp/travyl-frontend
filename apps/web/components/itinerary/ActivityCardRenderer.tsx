'use client';

import type { ActivityViewModel } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { ActivityCard } from './ActivityCard';
import { CompactActivityCard } from './CompactActivityCard';
import { MinimalActivityCard } from './MinimalActivityCard';
import { ListActivityCard } from './ListActivityCard';
import { ItineraryPinCard } from './ItineraryPinCard';

export type CardStyle = 'legacy' | 'compact' | 'minimal' | 'list' | 'pin';

const ACTIVITY_IMAGES: Record<string, string[]> = {
  'mock-a1': ['https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800', 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=800'],
  'mock-a2': ['https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800', 'https://images.unsplash.com/photo-1491245338813-c6832976196e?w=800'],
  'mock-a3': ['https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=800', 'https://images.unsplash.com/photo-1551634979-2b11f8c946fe?w=800'],
  'mock-a4': ['https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=800', 'https://images.unsplash.com/photo-1597910037310-7dd7ff4b4b0a?w=800'],
  'mock-a5': ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'],
  'mock-a6': ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800', 'https://images.unsplash.com/photo-1536663060084-a0d9eeeaf44b?w=800'],
  'mock-a7': ['https://images.unsplash.com/photo-1555992457-b8fefdd09699?w=800'],
  'mock-a8': ['https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800'],
  'mock-a9': ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800'],
};

function activityToDiscoverItem(activity: ActivityViewModel, images: string[]): DiscoverItem {
  const imgs = images.length > 0 ? images : (ACTIVITY_IMAGES[activity.id] || []);
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
  accentColor = '#1e3a5f',
  onClick,
  onFavorite,
  isFavorited = false,
  onAddToItinerary,
  onRemoveFromItinerary,
}: ActivityCardRendererProps) {
  switch (cardStyle) {
    case 'pin':
      return (
        <ItineraryPinCard
          item={activityToDiscoverItem(activity, images)}
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
          activity={activity}
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
          activity={activity}
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
          activity={activity}
          images={images}
          rating={rating}
          onClick={onClick}
          onFavorite={onFavorite}
          isFavorited={isFavorited}
        />
      );
    case 'legacy':
    default:
      return <ActivityCard activity={activity} onClick={onClick} />;
  }
}
