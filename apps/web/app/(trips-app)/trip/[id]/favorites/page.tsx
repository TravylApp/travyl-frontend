'use client';

import { use, useState, useCallback } from 'react';
import {
  Heart, MapPin, Star, Camera, UtensilsCrossed, Building2, Compass,
  Image as ImageIcon,
} from 'lucide-react';
import { useItineraryScreen, MOCK_DISCOVER_ACTIVITIES, MOCK_DISCOVER_RESTAURANTS } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { SplitScreenModal } from '@/components/itinerary';

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded bg-gray-200 ${className}`} style={style} />;
}

function FavoritesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="h-[140px] bg-gray-100" />
          <div className="p-3">
            <Skeleton style={{ width: '70%', height: 14 }} />
            <Skeleton className="mt-2" style={{ width: '55%', height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Pre-populate some sample favorites for demo
const INITIAL_ACTIVITY_FAVORITES = ['da1', 'da3', 'da6'];
const INITIAL_RESTAURANT_FAVORITES = ['rb2', 'rd1', 'rd4'];
const INITIAL_DESTINATION_FAVORITES = ['da2', 'da5', 'da8'];

function FavoriteCard({
  item,
  accentColor,
  onRemove,
  onClick,
}: {
  item: DiscoverItem;
  accentColor: string;
  onRemove: (id: string) => void;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const hasImage = item.images.length > 0 && !imgError;

  return (
    <div
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer relative border border-gray-100"
      onClick={onClick}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/95 hover:bg-red-50 rounded-full flex items-center justify-center shadow-md transition-all"
      >
        <Heart size={14} className="fill-red-500 text-red-500" />
      </button>

      <div className="relative h-[160px] overflow-hidden">
        {hasImage ? (
          <img
            src={item.images[0]}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <ImageIcon size={28} className="text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {item.rating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-sm">
            <Star size={10} className="text-amber-400" fill="#fbbf24" />
            <span className="text-[11px] text-gray-900" style={{ fontWeight: 600 }}>{item.rating.toFixed(1)}</span>
          </div>
        )}

        {item.price && (
          <div
            className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[10px] text-white shadow-sm"
            style={{ backgroundColor: accentColor, fontWeight: 500 }}
          >
            {item.price}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-1">
          <MapPin size={10} className="text-gray-400" />
          <span className="truncate">{item.location}</span>
        </div>
        <h3 className="text-[16px] text-gray-900 mb-1 line-clamp-1" style={{ fontWeight: 700 }}>
          {item.name}
        </h3>
        <p className="text-[12px] text-gray-500 line-clamp-2 mb-3">{item.description}</p>

        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-[10px] border"
              style={{
                backgroundColor: `${accentColor}0a`,
                borderColor: `${accentColor}20`,
                color: accentColor,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#ef444415' }}>
        <Heart size={24} style={{ color: '#ef4444' }} />
      </div>
      <h3 className="text-[17px] font-bold text-gray-900 mb-1.5">No favorites yet</h3>
      <p className="text-[13px] text-gray-500 text-center leading-5 mb-5">
        Save your favorite activities, restaurants, and places to quickly find them later.
      </p>
      <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Camera size={16} className="text-teal-600" />
          <span>Activities</span>
        </div>
        <div className="flex items-center gap-1">
          <UtensilsCrossed size={16} className="text-orange-600" />
          <span>Restaurants</span>
        </div>
        <div className="flex items-center gap-1">
          <Building2 size={16} className="text-blue-400" />
          <span>Hotels</span>
        </div>
      </div>
    </div>
  );
}

export default function TripFavorites({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading } = useItineraryScreen(id);

  const [activityFavorites, setActivityFavorites] = useState<string[]>(INITIAL_ACTIVITY_FAVORITES);
  const [restaurantFavorites, setRestaurantFavorites] = useState<string[]>(INITIAL_RESTAURANT_FAVORITES);
  const [destinationFavorites, setDestinationFavorites] = useState<string[]>(INITIAL_DESTINATION_FAVORITES);
  const [selectedModal, setSelectedModal] = useState<{ items: DiscoverItem[]; index: number; accentColor: string } | null>(null);

  const favoritedActivities = MOCK_DISCOVER_ACTIVITIES.filter((a) => activityFavorites.includes(a.id));
  const favoritedRestaurants = MOCK_DISCOVER_RESTAURANTS.filter((r) => restaurantFavorites.includes(r.id));
  const favoritedDestinations = MOCK_DISCOVER_ACTIVITIES.filter((a) => destinationFavorites.includes(a.id));

  const totalFavorites = favoritedActivities.length + favoritedRestaurants.length + favoritedDestinations.length;

  const removeActivityFavorite = (id: string) => {
    setActivityFavorites((prev) => prev.filter((f) => f !== id));
  };

  const removeRestaurantFavorite = (id: string) => {
    setRestaurantFavorites((prev) => prev.filter((f) => f !== id));
  };

  const removeDestinationFavorite = (id: string) => {
    setDestinationFavorites((prev) => prev.filter((f) => f !== id));
  };

  const toggleFavoriteFromModal = useCallback((itemId: string) => {
    if (activityFavorites.includes(itemId)) {
      removeActivityFavorite(itemId);
    } else if (restaurantFavorites.includes(itemId)) {
      removeRestaurantFavorite(itemId);
    } else if (destinationFavorites.includes(itemId)) {
      removeDestinationFavorite(itemId);
    }
  }, [activityFavorites, restaurantFavorites, destinationFavorites]);

  const allFavoriteIds = [...activityFavorites, ...restaurantFavorites, ...destinationFavorites];

  if (isLoading) return <FavoritesSkeleton />;

  if (totalFavorites === 0) return <EmptyState />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-[#1e3a5f] to-[#2c4f7f] rounded-full mb-3">
          <Heart size={24} className="text-white fill-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Your Favorites</h2>
        <p className="text-sm text-gray-600">{totalFavorites} saved items across all categories</p>
      </div>

      {/* Activities Section */}
      {favoritedActivities.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Activities & Attractions</h2>
              <p className="text-sm text-gray-600">{favoritedActivities.length} saved</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoritedActivities.map((item) => (
              <FavoriteCard
                key={item.id}
                item={item}
                accentColor="#0d9488"
                onRemove={removeActivityFavorite}
                onClick={() => setSelectedModal({ items: favoritedActivities, index: favoritedActivities.indexOf(item), accentColor: '#0d9488' })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Restaurants Section */}
      {favoritedRestaurants.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <UtensilsCrossed size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Restaurants & Dining</h2>
              <p className="text-sm text-gray-600">{favoritedRestaurants.length} saved</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoritedRestaurants.map((item) => (
              <FavoriteCard
                key={item.id}
                item={item}
                accentColor="#f97316"
                onRemove={removeRestaurantFavorite}
                onClick={() => setSelectedModal({ items: favoritedRestaurants, index: favoritedRestaurants.indexOf(item), accentColor: '#f97316' })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Saved Destinations */}
      {favoritedDestinations.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
              <Compass size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Saved Destinations</h2>
              <p className="text-sm text-gray-600">{favoritedDestinations.length} saved</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoritedDestinations.map((item) => (
              <FavoriteCard
                key={item.id}
                item={item}
                accentColor="#f59e0b"
                onRemove={removeDestinationFavorite}
                onClick={() => setSelectedModal({ items: favoritedDestinations, index: favoritedDestinations.indexOf(item), accentColor: '#f59e0b' })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hotels Section Placeholder */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-200">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Hotels & Accommodations</h2>
            <p className="text-sm text-gray-600">0 saved</p>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Hotel favorites will appear here when you heart items in the Hotels tab</p>
        </div>
      </div>

      {/* Split Screen Modal */}
      {selectedModal && (
        <SplitScreenModal
          items={selectedModal.items}
          initialIndex={selectedModal.index}
          accentColor={selectedModal.accentColor}
          favorites={allFavoriteIds}
          onClose={() => setSelectedModal(null)}
          onFavorite={toggleFavoriteFromModal}
        />
      )}
    </div>
  );
}
