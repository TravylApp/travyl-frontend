'use client';

import { use, useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { MapLocation } from '@/components/leaflet-map';
import { useItineraryContext } from '@/components/itinerary/ItineraryContext';
import {
  Hotel, Star, ChevronDown, ChevronLeft, ChevronRight, MapPin,
  Users, Wifi, Coffee, Car, Dumbbell, Waves, Search, Minus, Plus,
  Phone, Mail, Map, X, Camera, Shield, CreditCard, Share2,
  Snowflake, UtensilsCrossed, Sparkles, LayoutGrid, List, BookOpen,
} from 'lucide-react';
import { useItineraryScreen, useHotels as useDbHotels } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { useQuery } from '@tanstack/react-query';
import { PinCard } from '@/components/PinCard';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RoomType {
  type: string;
  beds: string;
  guests: number;
  size: string;
  price: number;
  image: string;
  amenities: string[];
}

interface HotelData {
  id: string;
  name: string;
  stars: number;
  rating: number;
  reviews: number;
  price: number;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  images: string[];
  amenities: string[];
  roomTypes: RoomType[];
  checkIn: string;
  checkOut: string;
  cancellation: string;
  phone: string;
  email: string;
  guestRatings: {
    overall: number;
    label: string;
    cleanliness: number;
    staff: number;
    location: number;
    comfort: number;
    value: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

// Hotel images from Unsplash (reliable hotel room/exterior photos)
const HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800',
  'https://images.unsplash.com/photo-1529551739587-e242c564f727?w=800',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
];
const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
  'https://images.unsplash.com/photo-1590490360182-c33d7d9d4048?w=400',
];

function convertFoursquareToHotelData(hotels: any[], idx_offset = 0): HotelData[] {
  return hotels.map((h: any, i: number) => {
    const idx = i + idx_offset;
    // Use REAL data from SerpAPI/planner when available, fallback to estimates
    const realStars = h.stars ?? (h.price ? Math.min(h.price + 2, 5) : 3);
    const realPrice = h.price ?? h.price_per_night ?? (realStars >= 4 ? 180 + i * 30 : 100 + i * 20);
    const realRating = h.rating ?? (8.0 + (i % 5) * 0.15);
    const realReviews = h.ratingCount ?? h.review_count ?? 0;
    const realAmenities = h.amenities?.length ? h.amenities : ['WiFi', 'Breakfast'];
    const mainImage = h.image ?? h.photo_url ?? HOTEL_IMAGES[idx % HOTEL_IMAGES.length];

    return {
      id: h.id ?? `hotel-${idx}`,
      name: h.name,
      stars: realStars,
      rating: realRating,
      reviews: realReviews,
      price: realPrice,
      address: h.address ?? '',
      neighborhood: h.category ?? 'City Center',
      lat: h.lat ?? 0,
      lng: h.lng ?? 0,
      images: [
        mainImage,
        HOTEL_IMAGES[(idx + 1) % HOTEL_IMAGES.length],
        HOTEL_IMAGES[(idx + 2) % HOTEL_IMAGES.length],
      ],
      amenities: realAmenities,
      roomTypes: [
        { type: 'Standard Room', beds: '1 Queen Bed', guests: 2, size: '22m²', price: realPrice, image: ROOM_IMAGES[0], amenities: ['WiFi', 'AC'] },
        { type: realStars >= 4 ? 'Deluxe Suite' : 'Superior Room', beds: '1 King Bed', guests: 2, size: realStars >= 4 ? '35m²' : '26m²', price: Math.round(realPrice * 1.4), image: ROOM_IMAGES[1], amenities: ['WiFi', 'AC', 'Minibar'] },
      ],
      checkIn: '3:00 PM',
      checkOut: '11:00 AM',
      cancellation: 'Free cancellation until 48h before',
      phone: '',
      email: h.link ?? '',
      guestRatings: {
        overall: realRating,
        label: realRating >= 4.5 ? 'Superb' : realRating >= 4.0 ? 'Excellent' : realRating >= 3.5 ? 'Very Good' : 'Good',
        cleanliness: Math.round((realRating + 0.1) * 10) / 10,
        staff: Math.round((realRating) * 10) / 10,
        location: Math.round((realRating + 0.2) * 10) / 10,
        comfort: Math.round((realRating) * 10) / 10,
        value: Math.round((realRating - 0.1) * 10) / 10,
      },
    };
  });
}

/** Convert DB hotel records (from hotels table) into local HotelData shape */
function convertDbHotelsToHotelData(hotels: any[]): HotelData[] {
  return hotels.map((h: any, i: number) => {
    const d = h.data ?? {};
    const realStars = d.star_rating ?? (d.rating >= 4.5 ? 5 : d.rating >= 3.5 ? 4 : 3);
    const realPrice = d.price_per_night ?? 150;
    const realRating = d.rating ?? 8.0;
    const mainImage = d.image_url ?? HOTEL_IMAGES[i % HOTEL_IMAGES.length];
    const realAmenities = d.amenities?.length ? d.amenities.slice(0, 8) : ['WiFi', 'Breakfast'];

    return {
      id: h.id,
      name: d.name ?? `Hotel ${i + 1}`,
      stars: realStars,
      rating: realRating,
      reviews: 0,
      price: realPrice,
      address: d.address ?? '',
      neighborhood: 'City Center',
      lat: d.latitude ?? 0,
      lng: d.longitude ?? 0,
      images: [mainImage, HOTEL_IMAGES[(i + 1) % HOTEL_IMAGES.length], HOTEL_IMAGES[(i + 2) % HOTEL_IMAGES.length]],
      amenities: realAmenities,
      roomTypes: [
        { type: 'Standard Room', beds: '1 Queen Bed', guests: 2, size: '22m²', price: realPrice, image: ROOM_IMAGES[0], amenities: ['WiFi', 'AC'] },
        { type: realStars >= 4 ? 'Deluxe Suite' : 'Superior Room', beds: '1 King Bed', guests: 2, size: realStars >= 4 ? '35m²' : '26m²', price: Math.round(realPrice * 1.4), image: ROOM_IMAGES[1], amenities: ['WiFi', 'AC', 'Minibar'] },
      ],
      checkIn: d.check_in ? new Date(d.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '3:00 PM',
      checkOut: d.check_out ? new Date(d.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '11:00 AM',
      cancellation: 'Free cancellation until 48h before',
      phone: '',
      email: d.booking_url ?? '',
      guestRatings: {
        overall: realRating,
        label: realRating >= 4.5 ? 'Superb' : realRating >= 4.0 ? 'Excellent' : realRating >= 3.5 ? 'Very Good' : 'Good',
        cleanliness: Math.round((realRating + 0.1) * 10) / 10,
        staff: Math.round(realRating * 10) / 10,
        location: Math.round((realRating + 0.2) * 10) / 10,
        comfort: Math.round(realRating * 10) / 10,
        value: Math.round((realRating - 0.1) * 10) / 10,
      },
    };
  });
}

function useHotels(tripId: string, searchQuery?: string) {
  const { trip } = useItineraryScreen(tripId);
  const destination = trip?.destination;

  // 1. DB hotels (saved during trip generation)
  const { data: dbHotelRows = [] } = useDbHotels(tripId);
  const fromDb = useMemo(
    () => dbHotelRows.length ? convertDbHotelsToHotelData(dbHotelRows) : [],
    [dbHotelRows],
  );

  // 2. Trip context hotels (from enrichment — SerpAPI / planner)
  const contextHotels = (trip?.trip_context as any)?.all_hotels?.length
    ? (trip?.trip_context as any).all_hotels
    : trip?.trip_context?.hotels;

  const fromContext = useMemo(
    () => contextHotels?.length ? convertFoursquareToHotelData(contextHotels) : [],
    [contextHotels],
  );

  // 3. Foursquare live search — use any available coordinates
  const firstDbHotel = dbHotelRows[0]?.data;
  const lat = (contextHotels?.[0] as any)?.lat ?? firstDbHotel?.latitude ?? trip?.trip_context?.lat;
  const lng = (contextHotels?.[0] as any)?.lng ?? firstDbHotel?.longitude ?? trip?.trip_context?.lng;
  const trimmedQuery = searchQuery?.trim() || '';
  const { data: fetchedHotels = [] } = useQuery({
    queryKey: ['hotels-foursquare', destination, trimmedQuery],
    queryFn: async () => {
      if (!lat || !lng) return [];
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        category: 'hotel',
        limit: '8',
      });
      if (trimmedQuery) params.set('q', trimmedQuery);
      const res = await fetch(`/api/foursquare?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return convertFoursquareToHotelData(data, fromDb.length + fromContext.length);
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!destination && !!(lat && lng),
  });

  // 4. SerpAPI Google Hotels search
  const { data: serpHotels = [] } = useQuery({
    queryKey: ['hotels-serp', destination, trip?.start_date, trip?.end_date],
    queryFn: async () => {
      if (!destination) return [];
      const params = new URLSearchParams({ destination });
      if (trip?.start_date) params.set('check_in', trip.start_date);
      if (trip?.end_date) params.set('check_out', trip.end_date);
      const res = await fetch(`/api/hotels/search?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.hotels ?? []).map((h: any, i: number): HotelData => ({
        id: h.id || `serp-${i}`,
        name: h.name,
        stars: h.stars,
        rating: h.rating,
        reviews: h.reviews,
        price: h.price ?? 0,
        address: h.address,
        neighborhood: h.neighborhood,
        lat: h.lat,
        lng: h.lng,
        images: h.images ?? [],
        amenities: h.amenities ?? [],
        roomTypes: [],
        checkIn: h.checkIn ?? '3:00 PM',
        checkOut: h.checkOut ?? '11:00 AM',
        cancellation: 'See hotel policy',
        phone: '',
        email: '',
        guestRatings: { overall: h.rating, cleanliness: 0, comfort: 0, location: 0, facilities: 0, staff: 0, value: 0 },
      }));
    },
    staleTime: 15 * 60 * 1000,
    enabled: !!destination,
  });

  // Combine: DB first, then context, then Foursquare, then SerpAPI — deduplicate by name
  return useMemo(() => {
    const seen = new Set<string>();
    return [...fromDb, ...fromContext, ...fetchedHotels, ...serpHotels].filter((h) => {
      const key = h.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [fromDb, fromContext, fetchedHotels, serpHotels]);
}

function hotelToPlaceItem(h: HotelData): PlaceItem {
  const priceTag = h.price ? `€${h.price}/night` : '';
  const starTag = h.stars ? '★'.repeat(h.stars) : '';
  return {
    id: h.id,
    name: h.name,
    image: h.images[0] || '',
    images: h.images,
    type: 'destination',
    rating: h.rating > 5 ? h.rating / 2 : h.rating,
    tagline: [priceTag, h.neighborhood].filter(Boolean).join(' · '),
    category: starTag ? `${starTag} Hotel` : 'Hotel',
    description: [h.address, h.cancellation].filter(Boolean).join(' · '),
    tags: h.amenities.slice(0, 4),
    latitude: h.lat,
    longitude: h.lng,
    address: h.address,
    reviewCount: h.reviews,
  };
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi size={12} />,
  Breakfast: <Coffee size={12} />,
  Pool: <Waves size={12} />,
  Parking: <Car size={12} />,
  Gym: <Dumbbell size={12} />,
  Spa: <Sparkles size={12} />,
  AC: <Snowflake size={12} />,
};

const FILTER_AMENITIES = ['WiFi', 'Breakfast', 'Pool', 'Parking', 'Gym', 'Spa'];
const HOTEL_BRANDS = ['Accor', 'Marriott', 'Hilton', 'IHG', 'Best Western'];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StarRating({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
      ))}
    </span>
  );
}

function ImageCarousel({
  images,
  alt,
  height = 'h-48',
}: {
  images: string[];
  alt: string;
  height?: string;
}) {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className={`relative w-full ${height} group`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[idx]}
        alt={`${alt} ${idx + 1}`}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-md">
            <ChevronLeft size={16} />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-md">
            <ChevronRight size={16} />
          </button>
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            {idx + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 1: Search / Filter Bar                                     */
/* ------------------------------------------------------------------ */

interface HotelFilters {
  sortBy: string;
  priceRange: [number, number];
  starFilter: number[];
  amenityFilter: string[];
  brandFilter: string[];
}

function HotelSearchFilter({
  isOpen,
  onToggle,
  filters,
  onFiltersChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  defaultCheckIn,
  defaultCheckOut,
  destination,
}: {
  isOpen: boolean;
  onToggle: () => void;
  filters: HotelFilters;
  onFiltersChange: (filters: HotelFilters) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearch: () => void;
  defaultCheckIn: string;
  defaultCheckOut: string;
  destination: string;
}) {
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const { sortBy, priceRange, starFilter, amenityFilter, brandFilter } = filters;

  const setSortBy = (v: string) => onFiltersChange({ ...filters, sortBy: v });
  const setPriceRange = (v: [number, number]) => onFiltersChange({ ...filters, priceRange: v });
  const setStarFilter = (v: number[]) => onFiltersChange({ ...filters, starFilter: v });
  const setAmenityFilter = (v: string[]) => onFiltersChange({ ...filters, amenityFilter: v });
  const setBrandFilter = (v: string[]) => onFiltersChange({ ...filters, brandFilter: v });

  const toggleStar = (s: number) =>
    setStarFilter(starFilter.includes(s) ? starFilter.filter((v) => v !== s) : [...starFilter, s]);
  const toggleAmenity = (a: string) =>
    setAmenityFilter(amenityFilter.includes(a) ? amenityFilter.filter((v) => v !== a) : [...amenityFilter, a]);
  const toggleBrand = (b: string) =>
    setBrandFilter(brandFilter.includes(b) ? brandFilter.filter((v) => v !== b) : [...brandFilter, b]);
  const resetFilters = () => {
    onFiltersChange({
      sortBy: 'recommended',
      priceRange: [0, 500],
      starFilter: [],
      amenityFilter: [],
      brandFilter: [],
    });
  };

  const nights = useMemo(() => {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkIn, checkOut]);

  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--background)] border border-gray-200 dark:border-white/[0.08] shadow-sm">
      {/* Header */}
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(200,169,106,0.15)', border: '1px solid rgba(200,169,106,0.25)' }}>
            <Hotel size={16} style={{ color: 'var(--magazine-accent, #c8a96a)' }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Update Hotel</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{destination || 'Search hotels'} &middot; {nights} nights &middot; {guests} guests</p>
          </div>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 dark:border-white/[0.06] px-4 py-3 space-y-3">
              {/* Compact search strip */}
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[160px]">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
                    placeholder="Hotel name or area..."
                    className="w-full mt-0.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#60a5fa]"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Check-in</label>
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full mt-0.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#60a5fa]" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Check-out</label>
                  <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full mt-0.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#60a5fa]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Guests</label>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1.5 py-1">
                    <button onClick={() => setGuests(Math.max(1, guests - 1))} className="text-gray-400 hover:text-gray-600 dark:text-gray-300"><Minus size={12} /></button>
                    <span className="text-xs font-medium w-5 text-center">{guests}</span>
                    <button onClick={() => setGuests(guests + 1)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300"><Plus size={12} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rooms</label>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1.5 py-1">
                    <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="text-gray-400 hover:text-gray-600 dark:text-gray-300"><Minus size={12} /></button>
                    <span className="text-xs font-medium w-5 text-center">{rooms}</span>
                    <button onClick={() => setRooms(rooms + 1)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300"><Plus size={12} /></button>
                  </div>
                </div>
                <button
                  onClick={onSearch}
                  className="flex items-center gap-1.5 bg-[#60a5fa] hover:bg-[#3b82f6] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Search size={13} /> Search
                </button>
              </div>

              {/* Advanced filters */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Filters</span>
                  <button onClick={resetFilters} className="text-[11px] text-[#60a5fa] hover:underline">Reset</button>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-300">Sort By</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#60a5fa]">
                    <option value="recommended">Recommended</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="rating">Guest Rating</option>
                    <option value="stars">Star Rating</option>
                  </select>
                </div>

                {/* Price range */}
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">Price Range (per night)</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">&euro;</span>
                      <input
                        type="number"
                        min={0}
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#60a5fa]"
                        placeholder="Min"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">&ndash;</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">&euro;</span>
                      <input
                        type="number"
                        min={0}
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#60a5fa]"
                        placeholder="Max"
                      />
                    </div>
                  </div>
                </div>

                {/* Star rating */}
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">Star Rating</span>
                  <div className="flex gap-1.5 mt-1">
                    {[3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleStar(s)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          starFilter.includes(s)
                            ? 'bg-amber-400 border-amber-400 text-white'
                            : 'border-gray-200 text-gray-600 dark:text-gray-300 hover:border-amber-300'
                        }`}
                      >
                        {s} <Star size={9} className="inline -mt-0.5 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">Amenities</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {FILTER_AMENITIES.map((a) => (
                      <button
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          amenityFilter.includes(a)
                            ? 'bg-[#60a5fa] border-[#60a5fa] text-white'
                            : 'border-gray-200 text-gray-600 dark:text-gray-300 hover:border-[#60a5fa]/50'
                        }`}
                      >
                        {AMENITY_ICONS[a]} {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hotel brands */}
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">Hotel Brands</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {HOTEL_BRANDS.map((b) => (
                      <button
                        key={b}
                        onClick={() => toggleBrand(b)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          brandFilter.includes(b)
                            ? 'bg-[#60a5fa] border-[#60a5fa] text-white'
                            : 'border-gray-200 text-gray-600 dark:text-gray-300 hover:border-[#60a5fa]/50'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 2: Browsing Hotels (list view)                             */
/* ------------------------------------------------------------------ */

function HotelDetailPanel({ hotel, onSelect }: { hotel: HotelData; onSelect: (h: HotelData) => void }) {
  const [selectedRoom, setSelectedRoom] = useState(0);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const nights = 5;
  const displayPrice = hotel.roomTypes[selectedRoom]?.price || hotel.price;
  const baseTotal = displayPrice * nights;
  const cityTax = 3.5 * 2 * nights;
  const serviceFee = 12;
  const vat = baseTotal * 0.1;
  const totalCost = baseTotal + cityTax + serviceFee + vat;

  return (
      <div className="px-4 md:px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Column — Hotel Info */}
          <div className="space-y-3">
            {/* Status badges */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-white text-xs px-2.5 py-1 rounded-full font-medium bg-[#60a5fa]">Selected</span>
                <span className="flex items-center gap-0.5 bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px]">
                  <Star size={9} className="fill-blue-600 text-blue-600" />
                  <span className="font-medium">{hotel.rating}/10</span>
                  <span className="text-blue-600">({hotel.reviews})</span>
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{hotel.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-gray-600 dark:text-gray-300">
                  Check-in: {hotel.checkIn} &bull; Check-out: {hotel.checkOut}
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium text-[10px] inline-flex items-center gap-0.5">
                  <Shield size={9} /> {hotel.cancellation}
                </span>
              </div>
            </div>

            {/* Mobile-only image */}
            <div className="md:hidden rounded-lg overflow-hidden shadow-md border-2" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
              <ImageCarousel images={hotel.images} alt={hotel.name} height="h-52" />
            </div>

            {/* Pricing Summary — Collapsible */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setPriceOpen(!priceOpen); }}
                className="w-full flex items-center justify-between p-3 hover:bg-trip-base/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Total Cost</span>
                  <span className="text-xs text-gray-400">({nights} nights)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{totalCost.toFixed(2)}</span>
                  <ChevronDown size={14} className={`transition-transform ${priceOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--trip-base)' }} />
                </div>
              </button>
              <AnimatePresence>
                {priceOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-1.5 border-t" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.1)' }}>
                      <div className="pt-2 flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Room</span><span className="font-medium" style={{ color: 'var(--trip-base)' }}>{hotel.roomTypes[selectedRoom].type}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">Rate</span><span className="font-semibold" style={{ color: 'var(--trip-base)' }}>&euro;{displayPrice}/night</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">{nights} nights subtotal</span><span className="font-semibold" style={{ color: 'var(--trip-base)' }}>&euro;{baseTotal.toFixed(2)}</span></div>
                      <div className="pt-1.5 border-t space-y-1" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.1)' }}>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Taxes & Fees</span>
                        <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">City Tax</span><span>&euro;{cityTax.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">Service Fee</span><span>&euro;{serviceFee.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">VAT (10%)</span><span>&euro;{vat.toFixed(2)}</span></div>
                      </div>
                      <div className="pt-1.5 border-t flex justify-between" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</span>
                        <span className="font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Room Selection — Collapsible */}
            <div className="bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/[0.08] overflow-hidden">
              <button
                onClick={(e) => { e.stopPropagation(); setRoomsOpen(!roomsOpen); }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Hotel size={14} style={{ color: 'var(--trip-base)' }} />
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Room Options</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: 'var(--trip-base)', backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)', borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                    {hotel.roomTypes[selectedRoom].type}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${roomsOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {roomsOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 border-t border-gray-200 dark:border-white/[0.08] space-y-2 pt-2">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Select a room type</p>
                      {hotel.roomTypes.map((room, idx) => {
                        const isSelected = selectedRoom === idx;
                        const roomKey = `detail-${hotel.id}-${idx}`;
                        const priceDiff = room.price - hotel.roomTypes[0].price;
                        return (
                          <div key={idx}>
                            <div
                              onClick={(e) => { e.stopPropagation(); setSelectedRoom(idx); }}
                              className={`cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                                isSelected ? '' : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/15'
                              }`}
                              style={isSelected ? { borderColor: 'var(--trip-base)', backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)' } : undefined}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="w-20 h-20 flex-shrink-0 relative group/thumb cursor-zoom-in"
                                  onClick={(e) => { e.stopPropagation(); setExpandedRoom(expandedRoom === roomKey ? null : roomKey); }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={room.image} alt={room.type} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-all flex items-center justify-center">
                                    <Camera size={14} className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow-lg" />
                                  </div>
                                </div>
                                <div className="flex-1 p-2.5 pl-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-xs font-semibold ${isSelected ? '' : 'text-gray-900 dark:text-gray-100'}`} style={isSelected ? { color: 'var(--trip-base)' } : undefined}>{room.type}</span>
                                        {isSelected && <span className="text-white text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--trip-base)' }}>Selected</span>}
                                        {priceDiff > 0 && !isSelected && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">+&euro;{priceDiff}/nt</span>}
                                      </div>
                                      <p className="text-[10px] text-gray-600 dark:text-gray-300">{room.beds}</p>
                                      <div className="flex items-center gap-2.5 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                        <span className="flex items-center gap-0.5"><Users size={10} />{room.guests}</span>
                                        <span>{room.size}</span>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className={`text-sm font-bold ${isSelected ? '' : 'text-gray-900 dark:text-gray-100'}`} style={isSelected ? { color: 'var(--trip-base)' } : undefined}>&euro;{room.price}</p>
                                      <p className="text-[9px] text-gray-500 dark:text-gray-400">per night</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded room detail */}
                            <AnimatePresence>
                              {expandedRoom === roomKey && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="mt-1.5 bg-white dark:bg-[var(--background)] rounded-lg border-2 overflow-hidden" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                                    <div className="relative w-full h-48">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={room.image} alt={room.type} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                                      <button onClick={(e) => { e.stopPropagation(); setExpandedRoom(null); }} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"><X size={12} /></button>
                                    </div>
                                    <div className="p-3 space-y-2">
                                      <div className="flex justify-between">
                                        <div>
                                          <h6 className="text-xs font-semibold text-gray-900 dark:text-gray-100">{room.type}</h6>
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{room.beds} &middot; {room.size} &middot; {room.guests} guests</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{room.price}<span className="text-[10px] text-gray-400 font-normal">/nt</span></p>
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400">&euro;{room.price * nights} total</p>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {room.amenities.map((a, i) => (
                                          <span key={i} className="text-[10px] bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/[0.08]">{a}</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Contact & Location */}
            <div className="pt-3 border-t space-y-2" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
              <div className="grid grid-cols-3 gap-2">
                <a href={`tel:${hotel.phone}`} onClick={(e) => e.stopPropagation()} className="flex flex-col items-center justify-center gap-1.5 bg-white dark:bg-white/5 rounded-md p-2.5 border border-gray-200 dark:border-white/[0.08] hover:border-trip-base hover:shadow-sm transition-all">
                  <Phone size={14} style={{ color: 'var(--trip-base)' }} />
                  <span className="text-xs text-gray-900 dark:text-gray-100 font-medium">Call</span>
                </a>
                <a href={`mailto:${hotel.email}`} onClick={(e) => e.stopPropagation()} className="flex flex-col items-center justify-center gap-1.5 bg-white dark:bg-white/5 rounded-md p-2.5 border border-gray-200 dark:border-white/[0.08] hover:border-trip-base hover:shadow-sm transition-all">
                  <Mail size={14} style={{ color: 'var(--trip-base)' }} />
                  <span className="text-xs text-gray-900 dark:text-gray-100 font-medium">Email</span>
                </a>
                <button onClick={(e) => e.stopPropagation()} className="flex flex-col items-center justify-center gap-1.5 bg-white dark:bg-white/5 rounded-md p-2.5 border border-gray-200 dark:border-white/[0.08] hover:border-trip-base hover:shadow-sm transition-all">
                  <MapPin size={14} className="text-[#8b6f47]" />
                  <span className="text-xs text-gray-900 dark:text-gray-100 font-medium">Map</span>
                </button>
              </div>

              {/* Location */}
              <div className="bg-white dark:bg-white/5 rounded-md p-2.5 border border-gray-200 dark:border-white/[0.08]">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-[#8b6f47] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">{hotel.address}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--trip-base)' }}>{hotel.neighborhood}</p>
                  </div>
                </div>
              </div>

              {/* Guest Ratings */}
              <div className="bg-white dark:bg-white/5 rounded-md border border-gray-200 dark:border-white/[0.08] overflow-hidden">
                <div className="flex items-center gap-2.5 p-2">
                  <div
                    className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                      hotel.guestRatings.overall >= 9 ? 'bg-emerald-500' : hotel.guestRatings.overall >= 8 ? '' : 'bg-orange-500'
                    }`}
                    style={hotel.guestRatings.overall >= 8 && hotel.guestRatings.overall < 9 ? { backgroundColor: 'var(--trip-base)' } : undefined}
                  >
                    {hotel.guestRatings.overall}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{hotel.guestRatings.label}</span>
                      <span className="text-[10px] text-gray-400">&middot; {hotel.reviews} reviews</span>
                    </div>
                    <div className="flex flex-wrap gap-x-2 mt-1">
                      {[
                        { label: 'Clean', score: hotel.guestRatings.cleanliness },
                        { label: 'Staff', score: hotel.guestRatings.staff },
                        { label: 'Location', score: hotel.guestRatings.location },
                        { label: 'Comfort', score: hotel.guestRatings.comfort },
                        { label: 'Value', score: hotel.guestRatings.value },
                      ].map((item) => (
                        <span key={item.label} className="text-[9px] text-gray-500 dark:text-gray-400">
                          {item.label} <span className="font-semibold text-gray-700 dark:text-gray-200">{item.score}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Select Hotel Button */}
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(hotel); }}
              className="w-full py-2.5 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--trip-base)' }}
            >
              <Hotel size={16} />
              Select Hotel
            </button>
          </div>

          {/* Right Column — Image & Amenities */}
          <div className="space-y-3">
            <div className="hidden md:block rounded-lg overflow-hidden shadow-md border-2" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
              <ImageCarousel images={hotel.images} alt={hotel.name} height="h-64 md:h-80" />
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-1.5">
              {hotel.amenities.map((a) => (
                <span key={a} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  {AMENITY_ICONS[a]} {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}

function BrowsingHotelGridCard({
  hotel,
  onViewDetails,
  isActive,
}: {
  hotel: HotelData;
  onViewDetails: () => void;
  isActive: boolean;
}) {
  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all flex flex-col cursor-pointer ${
        isActive ? 'border-[var(--trip-base)] shadow-md ring-2 ring-[var(--trip-base)]/20' : 'border-gray-200 bg-white dark:bg-[var(--background)] hover:shadow-md'
      }`}
      onClick={onViewDetails}
    >
      <ImageCarousel images={hotel.images} alt={hotel.name} height="h-44" />
      <div className="p-3.5 flex flex-col flex-1 bg-white dark:bg-[var(--background)]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{hotel.name}</h4>
            <StarRating count={hotel.stars} />
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{hotel.price}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">per night</p>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MapPin size={11} />
          <span className="truncate">{hotel.neighborhood}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`text-xs font-bold text-white px-1.5 py-0.5 rounded ${hotel.rating >= 9 ? 'bg-emerald-500' : hotel.rating >= 8 ? '' : 'bg-orange-500'}`}
            style={hotel.rating >= 8 && hotel.rating < 9 ? { backgroundColor: 'var(--trip-base)' } : undefined}
          >
            {hotel.rating}
          </span>
          <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{hotel.guestRatings.label}</span>
          <span className="text-[10px] text-gray-400">{hotel.reviews.toLocaleString()} reviews</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {hotel.amenities.slice(0, 4).map((a) => (
            <span key={a} className="flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/[0.08]">
              {AMENITY_ICONS[a]} {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrowsingHotelListCard({
  hotel,
  onViewDetails,
  isActive,
}: {
  hotel: HotelData;
  onViewDetails: () => void;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row rounded-xl border overflow-hidden transition-all cursor-pointer ${
        isActive ? 'border-[var(--trip-base)] shadow-md ring-2 ring-[var(--trip-base)]/20' : 'border-gray-200 bg-white dark:bg-[var(--background)] hover:shadow-md'
      }`}
      onClick={onViewDetails}
    >
      <div className="sm:w-60 flex-shrink-0">
        <ImageCarousel images={hotel.images} alt={hotel.name} height="h-48 sm:h-full" />
      </div>
      <div className="flex-1 p-4 flex flex-col justify-between bg-white dark:bg-[var(--background)]">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{hotel.name}</h4>
              <StarRating count={hotel.stars} />
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{hotel.price}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">per night</p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            <MapPin size={11} />
            <span>{hotel.address}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`text-xs font-bold text-white px-1.5 py-0.5 rounded ${hotel.rating >= 9 ? 'bg-emerald-500' : hotel.rating >= 8 ? '' : 'bg-orange-500'}`}
              style={hotel.rating >= 8 && hotel.rating < 9 ? { backgroundColor: 'var(--trip-base)' } : undefined}
            >
              {hotel.rating}
            </span>
            <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium">{hotel.guestRatings.label}</span>
            <span className="text-[10px] text-gray-400">{hotel.reviews.toLocaleString()} reviews</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {hotel.amenities.map((a) => (
              <span key={a} className="flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/[0.08]">
                {AMENITY_ICONS[a]} {a}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowsingHotelBookView({
  hotels,
  onSelect,
}: {
  hotels: HotelData[];
  onSelect: (h: HotelData) => void;
}) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const hotel = hotels[page];

  const goTo = (next: number) => {
    setDirection(next > page ? 1 : -1);
    setPage(next);
  };

  const variants = {
    enter: (d: number) => ({
      rotateY: d > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.95,
    }),
    center: { rotateY: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({
      rotateY: d > 0 ? -90 : 90,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <div>
      {/* Page-flip container */}
      <div className="relative" style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: direction > 0 ? 'left center' : 'right center' }}
          >
            <div className="bg-white dark:bg-[var(--background)] rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left page — large image */}
                <div className="relative">
                  <ImageCarousel images={hotel.images} alt={hotel.name} height="h-72 md:h-96" />
                  {/* Page number badge */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full shadow-sm">
                    {page + 1} / {hotels.length}
                  </div>
                </div>

                {/* Right page — hotel details */}
                <div className="p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating count={hotel.stars} />
                    <span
                      className={`text-xs font-bold text-white px-1.5 py-0.5 rounded ${hotel.rating >= 9 ? 'bg-emerald-500' : hotel.rating >= 8 ? '' : 'bg-orange-500'}`}
                      style={hotel.rating >= 8 && hotel.rating < 9 ? { backgroundColor: 'var(--trip-base)' } : undefined}
                    >
                      {hotel.rating}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{hotel.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin size={12} />
                    <span>{hotel.neighborhood} &middot; {hotel.address}</span>
                  </div>

                  <div className="mt-4 space-y-3 flex-1">
                    {/* Rating summary */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                          hotel.rating >= 9 ? 'bg-emerald-500' : hotel.rating >= 8 ? '' : 'bg-orange-500'
                        }`}
                        style={hotel.rating >= 8 && hotel.rating < 9 ? { backgroundColor: 'var(--trip-base)' } : undefined}
                      >
                        {hotel.guestRatings.overall}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{hotel.guestRatings.label}</p>
                        <p className="text-[10px] text-gray-400">{hotel.reviews.toLocaleString()} reviews</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="rounded-lg p-3 flex items-baseline justify-between" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)' }}>
                      <span className="text-sm text-gray-600 dark:text-gray-300">From</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{hotel.price}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/ night</span>
                      </div>
                    </div>

                    {/* Room types preview */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Room Types</p>
                      <div className="space-y-1">
                        {hotel.roomTypes.map((room, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 border border-gray-100">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{room.type}</span>
                              <span className="text-gray-400 ml-1.5">{room.beds}</span>
                            </div>
                            <span className="font-semibold" style={{ color: 'var(--trip-base)' }}>&euro;{room.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-1.5">
                      {hotel.amenities.map((a) => (
                        <span key={a} className="flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/[0.08]">
                          {AMENITY_ICONS[a]} {a}
                        </span>
                      ))}
                    </div>

                    {/* Check-in/out */}
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-gray-500 dark:text-gray-400">Check-in: <span className="font-medium text-gray-700 dark:text-gray-200">{hotel.checkIn}</span></span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500 dark:text-gray-400">Check-out: <span className="font-medium text-gray-700 dark:text-gray-200">{hotel.checkOut}</span></span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelect(hotel)}
                    className="mt-4 w-full bg-[#60a5fa] hover:bg-[#3b82f6] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Select Hotel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => goTo(Math.max(0, page - 1))}
          disabled={page === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
          Previous
        </button>
        <div className="flex gap-1.5">
          {hotels.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === page ? 'bg-[#60a5fa] w-5' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => goTo(Math.min(hotels.length - 1, page + 1))}
          disabled={page === hotels.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function BrowsingHotelsSection({
  hotels,
  isOpen,
  onToggle,
  onSelect,
}: {
  hotels: HotelData[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (h: HotelData) => void;
}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'book'>('grid');
  const [detailHotel, setDetailHotel] = useState<HotelData | null>(null);
  const { setMapMarkers, setSelectedMarkerId, setRequestMapOpen } = useItineraryContext();

  const mapLocations: MapLocation[] = useMemo(
    () =>
      hotels.map((h) => ({
        id: h.id,
        lat: h.lat,
        lng: h.lng,
        name: h.name,
        color: h.rating >= 9 ? '#10b981' : h.rating >= 8 ? 'var(--trip-base)' : '#f97316',
        category: `${h.stars}★ · €${h.price}/night`,
      })),
    [hotels],
  );

  // Push markers to layout map when browsing opens (don't auto-open map)
  useEffect(() => {
    if (isOpen) {
      setMapMarkers(mapLocations);
    } else {
      setMapMarkers([]);
      setSelectedMarkerId(undefined);
    }
    return () => {
      setMapMarkers([]);
      setSelectedMarkerId(undefined);
      setRequestMapOpen(false);
    };
  }, [isOpen, mapLocations, setMapMarkers, setSelectedMarkerId, setRequestMapOpen]);

  const handleHover = (id: string | null) => {
    setSelectedMarkerId(id ?? undefined);
  };

  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-[var(--background)] border border-gray-200 dark:border-white/[0.08] shadow-sm">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50">
        <div className="flex items-center gap-2.5">
          <Search size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Browsing Hotels</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent, #c8a96a)', border: '1px solid rgba(200,169,106,0.25)' }}>{hotels.length} results</span>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 dark:border-white/[0.06] px-4 py-3 space-y-3">
              {/* Selected hotel detail — full-width card */}
              <AnimatePresence mode="wait">
                {detailHotel && (
                  <motion.div
                    key={`detail-${detailHotel.id}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-xl overflow-hidden shadow-lg border-2 border-[#60a5fa]/40"
                  >
                    {/* Banner */}
                    <div className="px-4 py-2 flex items-center justify-between bg-[#60a5fa]">
                      <div className="flex items-center gap-2 text-white">
                        <Hotel size={14} />
                        <span className="font-semibold text-sm">Selected Hotel</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailHotel(null); }}
                        className="text-white/80 hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="bg-white dark:bg-[var(--background)]">
                      <HotelDetailPanel hotel={detailHotel} onSelect={onSelect} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* View toggle + hotel list */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {detailHotel ? 'Other hotels' : `${hotels.length} hotels`}
                </span>
                <div className="flex items-center gap-1">
                  {([
                    { mode: 'grid' as const, icon: LayoutGrid, label: 'Grid view' },
                    { mode: 'list' as const, icon: List, label: 'List view' },
                    { mode: 'book' as const, icon: BookOpen, label: 'Book view' },
                  ] as const).map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={(e) => { e.stopPropagation(); setViewMode(mode); }}
                      className={`p-1.5 rounded-md transition-colors ${
                        viewMode === mode
                          ? 'bg-[#60a5fa] text-white'
                          : 'bg-gray-100 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                      title={label}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {hotels.map((hotel, i) => (
                    <div
                      key={hotel.id}
                      onMouseEnter={() => handleHover(hotel.id)}
                      onMouseLeave={() => handleHover(null)}
                      onClick={() => setDetailHotel(detailHotel?.id === hotel.id ? null : hotel)}
                    >
                      <PinCard
                        item={hotelToPlaceItem(hotel)}
                        index={i}
                        isFavorited={false}
                        onFavorite={() => {}}
                      />
                    </div>
                  ))}
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-3">
                  {hotels.map((hotel) => (
                    <div
                      key={hotel.id}
                      onMouseEnter={() => handleHover(hotel.id)}
                      onMouseLeave={() => handleHover(null)}
                    >
                      <BrowsingHotelListCard
                        hotel={hotel}
                        onViewDetails={() => setDetailHotel(detailHotel?.id === hotel.id ? null : hotel)}
                        isActive={detailHotel?.id === hotel.id}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <BrowsingHotelBookView hotels={hotels} onSelect={onSelect} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section 3: Booked Hotel Card                                       */
/* ------------------------------------------------------------------ */

function BookedHotelCard({
  hotel,
  onCancel,
}: {
  hotel: HotelData;
  onCancel: () => void;
}) {
  const [priceOpen, setPriceOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(0);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  const nights = 5;
  const baseTotal = hotel.price * nights;
  const cityTax = 3.5 * 2 * nights;
  const serviceFee = 12;
  const vat = baseTotal * 0.1;
  const totalCost = baseTotal + cityTax + serviceFee + vat;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08] shadow-sm bg-white dark:bg-[var(--background)]">
      {/* Gradient banner header */}
      <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, var(--trip-base), var(--trip-base-light))' }}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <Hotel size={16} />
            <div>
              <p className="text-sm font-semibold">{hotel.name}</p>
              <p className="text-[11px] opacity-80">
                <StarRating count={hotel.stars} /> &middot; &euro;{hotel.price}/night &middot; {nights} nights
              </p>
            </div>
          </div>
          <span className="bg-emerald-500 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">Booked</span>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left column */}
          <div className="space-y-3">
            {/* Status badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-[10px] px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--trip-base)' }}>Confirmed</span>
              <span className="flex items-center gap-0.5 bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px]">
                <Star size={9} className="fill-blue-600 text-blue-600" />
                <span className="font-medium">{hotel.rating}/10</span>
                <span className="text-blue-600">({hotel.reviews})</span>
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{hotel.name}</h3>

            {/* Check-in / check-out */}
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 px-3 py-2">
                <span className="text-[10px] text-blue-800 block font-medium">Check-in</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Mar 22 &middot; {hotel.checkIn}</span>
              </div>
              <div className="flex-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 px-3 py-2">
                <span className="text-[10px] text-blue-800 block font-medium">Check-out</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Mar 27 &middot; {hotel.checkOut}</span>
              </div>
            </div>

            {/* Cancellation badge */}
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-medium">
              <Shield size={10} /> {hotel.cancellation}
            </span>

            {/* Your Room — prominent selected room details */}
            {hotel.roomTypes[selectedRoom] && (() => {
              const room = hotel.roomTypes[selectedRoom];
              return (
                <div className="rounded-lg border-2 overflow-hidden" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                  <div className="relative h-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={room.image} alt={room.type} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white">Your Room</span>
                          <h4 className="text-sm font-bold text-white mt-1">{room.type}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">&euro;{room.price}<span className="text-[10px] font-normal opacity-70">/night</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2.5 bg-white dark:bg-[var(--background)]">
                    {/* Room specs */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-1"><Users size={12} style={{ color: 'var(--trip-base)' }} /> {room.guests} {room.guests === 1 ? 'Guest' : 'Guests'}</span>
                      <span className="text-gray-300">|</span>
                      <span>{room.beds}</span>
                      <span className="text-gray-300">|</span>
                      <span>{room.size}</span>
                    </div>

                    {/* Room amenities */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Room Amenities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {room.amenities.map((a, idx) => (
                          <span key={idx} className="text-[10px] bg-gray-50 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md border border-gray-200 flex items-center gap-1">
                            {AMENITY_ICONS[a] || null} {a}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quick info grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md p-2 text-center" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)' }}>
                        <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Stay</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{(room.price * nights).toFixed(0)}</p>
                        <p className="text-[9px] text-gray-400">{nights} nights</p>
                      </div>
                      <div className="rounded-md bg-gray-50 p-2 text-center">
                        <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Check-in</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{hotel.checkIn}</p>
                        <p className="text-[9px] text-gray-400">Mar 22</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Pricing breakdown (collapsible) */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)' }}>
              <button onClick={() => setPriceOpen(!priceOpen)} className="w-full flex items-center justify-between p-3 hover:bg-trip-base/10 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Total Cost</span>
                  <span className="text-xs text-gray-400">({nights} nights)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{totalCost.toFixed(2)}</span>
                  <ChevronDown size={14} className={`transition-transform ${priceOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--trip-base)' }} />
                </div>
              </button>
              <AnimatePresence>
                {priceOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 space-y-1.5 border-t" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.1)' }}>
                      <div className="pt-2 flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Room</span><span className="font-medium" style={{ color: 'var(--trip-base)' }}>{hotel.roomTypes[selectedRoom].type}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">Rate</span><span className="font-semibold" style={{ color: 'var(--trip-base)' }}>&euro;{hotel.price}/night</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">{nights} nights subtotal</span><span className="font-semibold" style={{ color: 'var(--trip-base)' }}>&euro;{baseTotal.toFixed(2)}</span></div>
                      <div className="pt-1.5 border-t space-y-1" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.1)' }}>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Taxes & Fees</span>
                        <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">City Tax</span><span>&euro;{cityTax.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">Service Fee</span><span>&euro;{serviceFee.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-gray-300">VAT (10%)</span><span>&euro;{vat.toFixed(2)}</span></div>
                      </div>
                      <div className="pt-1.5 border-t flex justify-between" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</span>
                        <span className="font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Room options (collapsible) */}
            <div className="bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/[0.08] overflow-hidden">
              <button onClick={() => setRoomsOpen(!roomsOpen)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <Hotel size={14} style={{ color: 'var(--trip-base)' }} />
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Room Options</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: 'var(--trip-base)', backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)', borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                    {hotel.roomTypes[selectedRoom].type}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${roomsOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {roomsOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 border-t border-gray-200 dark:border-white/[0.08] space-y-2 pt-2">
                      {hotel.roomTypes.map((room, idx) => {
                        const isSelected = selectedRoom === idx;
                        const roomKey = `room-${hotel.id}-${idx}`;
                        const priceDiff = room.price - hotel.roomTypes[0].price;
                        return (
                          <div key={idx}>
                            <div
                              onClick={() => { setSelectedRoom(idx); setExpandedRoom(null); }}
                              className={`cursor-pointer rounded-lg border-2 transition-all overflow-hidden flex items-start gap-3 ${
                                isSelected ? '' : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/15'
                              }`}
                              style={isSelected ? { borderColor: 'var(--trip-base)', backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)' } : undefined}
                            >
                              <div
                                className="w-20 h-20 flex-shrink-0 relative group/thumb cursor-zoom-in"
                                onClick={(e) => { e.stopPropagation(); setExpandedRoom(expandedRoom === roomKey ? null : roomKey); }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={room.image} alt={room.type} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-all flex items-center justify-center">
                                  <Camera size={14} className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow-lg" />
                                </div>
                              </div>
                              <div className="flex-1 p-2.5 pl-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className={`text-xs font-semibold ${isSelected ? '' : 'text-gray-900 dark:text-gray-100'}`} style={isSelected ? { color: 'var(--trip-base)' } : undefined}>{room.type}</span>
                                      {isSelected && <span className="text-white text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--trip-base)' }}>Current</span>}
                                      {priceDiff > 0 && !isSelected && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">+&euro;{priceDiff}/nt</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-600 dark:text-gray-300">{room.beds}</p>
                                    <div className="flex items-center gap-2.5 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                      <span className="flex items-center gap-0.5"><Users size={10} />{room.guests}</span>
                                      <span>{room.size}</span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className={`text-sm font-bold ${isSelected ? '' : 'text-gray-900 dark:text-gray-100'}`} style={isSelected ? { color: 'var(--trip-base)' } : undefined}>&euro;{room.price}</p>
                                    <p className="text-[9px] text-gray-500 dark:text-gray-400">per night</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded room detail */}
                            <AnimatePresence>
                              {expandedRoom === roomKey && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="mt-1.5 bg-white dark:bg-[var(--background)] rounded-lg border-2 overflow-hidden" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                                    <div className="relative w-full h-48">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={room.image} alt={room.type} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                                      <button onClick={() => setExpandedRoom(null)} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"><X size={12} /></button>
                                    </div>
                                    <div className="p-3 space-y-2">
                                      <div className="flex justify-between">
                                        <div>
                                          <h6 className="text-xs font-semibold text-gray-900 dark:text-gray-100">{room.type}</h6>
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{room.beds} &middot; {room.size} &middot; {room.guests} guests</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{room.price}<span className="text-[10px] text-gray-400 font-normal">/nt</span></p>
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400">&euro;{room.price * nights} total</p>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {room.amenities.map((a, i) => (
                                          <span key={i} className="text-[10px] bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/[0.08]">{a}</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Booking details */}
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 space-y-1.5 border border-gray-200 dark:border-white/[0.08]">
              <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Booking Details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-gray-500 dark:text-gray-400">Confirmation #</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">HTL-2026-{hotel.id.toUpperCase()}</span>
                <span className="text-gray-500 dark:text-gray-400">Property ID</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{hotel.id.toUpperCase()}-PAR</span>
                <span className="text-gray-500 dark:text-gray-400">Guest</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">2 Adults</span>
                <span className="text-gray-500 dark:text-gray-400">Payment</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1"><CreditCard size={10} /> **** 4242</span>
              </div>
            </div>

            {/* Hotel policies (collapsible) */}
            <div className="bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/[0.08] overflow-hidden">
              <button onClick={() => setPoliciesOpen(!policiesOpen)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Hotel Policies</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${policiesOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {policiesOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 border-t border-gray-100 dark:border-white/[0.06] space-y-1.5 pt-2 text-xs text-gray-600 dark:text-gray-300">
                      <p>Check-in from {hotel.checkIn}, Check-out by {hotel.checkOut}</p>
                      <p>{hotel.cancellation}</p>
                      <p>No smoking. Pets allowed upon request (+&euro;25/night).</p>
                      <p>City tax of &euro;3.50 per person per night (included in total).</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button onClick={onCancel} className="flex-1 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-lg px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Cancel Booking</button>
              <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold border rounded-lg px-3 py-2 hover:bg-trip-base/5 transition-colors" style={{ color: 'var(--trip-base)', borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                <Share2 size={12} /> Share
              </button>
            </div>
          </div>

          {/* Right column - image + amenities + contact + ratings */}
          <div className="space-y-3">
            {/* Image carousel */}
            <div className="rounded-lg overflow-hidden border-2 shadow-md" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
              <ImageCarousel images={hotel.images} alt={hotel.name} height="h-64 md:h-80" />
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-2">
              {hotel.amenities.map((a) => (
                <span key={a} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  {AMENITY_ICONS[a]} {a}
                </span>
              ))}
            </div>

            {/* Contact actions */}
            <div className="grid grid-cols-3 gap-2">
              <a href={`tel:${hotel.phone}`} className="flex flex-col items-center justify-center gap-1.5 bg-white dark:bg-white/5 rounded-md p-2.5 border border-gray-200 dark:border-white/[0.08] hover:border-trip-base hover:shadow-sm transition-all">
                <Phone size={14} style={{ color: 'var(--trip-base)' }} />
                <span className="text-xs text-gray-900 dark:text-gray-100 font-medium">Call</span>
              </a>
              <a href={`mailto:${hotel.email}`} className="flex flex-col items-center justify-center gap-1.5 bg-white dark:bg-white/5 rounded-md p-2.5 border border-gray-200 dark:border-white/[0.08] hover:border-trip-base hover:shadow-sm transition-all">
                <Mail size={14} style={{ color: 'var(--trip-base)' }} />
                <span className="text-xs text-gray-900 dark:text-gray-100 font-medium">Email</span>
              </a>
              <button className="flex flex-col items-center justify-center gap-1.5 bg-white dark:bg-white/5 rounded-md p-2.5 border border-gray-200 dark:border-white/[0.08] hover:border-trip-base hover:shadow-sm transition-all">
                <Map size={14} className="text-[#8b6f47]" />
                <span className="text-xs text-gray-900 dark:text-gray-100 font-medium">Map</span>
              </button>
            </div>

            {/* Location */}
            <div className="bg-white dark:bg-white/5 rounded-md p-2.5 border border-gray-200 dark:border-white/[0.08]">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-[#8b6f47] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">{hotel.address}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--trip-base)' }}>{hotel.neighborhood}</p>
                </div>
              </div>
            </div>

            {/* Guest ratings */}
            <div className="bg-white dark:bg-white/5 rounded-md border border-gray-200 dark:border-white/[0.08] overflow-hidden">
              <div className="flex items-center gap-2.5 p-2.5">
                <div
                  className={`w-9 h-9 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                    hotel.guestRatings.overall >= 9 ? 'bg-emerald-500' : hotel.guestRatings.overall >= 8 ? '' : 'bg-orange-500'
                  }`}
                  style={hotel.guestRatings.overall >= 8 && hotel.guestRatings.overall < 9 ? { backgroundColor: 'var(--trip-base)' } : undefined}
                >
                  {hotel.guestRatings.overall}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{hotel.guestRatings.label}</span>
                    <span className="text-[10px] text-gray-400">&middot; {hotel.reviews} reviews</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2.5 mt-1">
                    {[
                      { label: 'Clean', score: hotel.guestRatings.cleanliness },
                      { label: 'Staff', score: hotel.guestRatings.staff },
                      { label: 'Location', score: hotel.guestRatings.location },
                      { label: 'Comfort', score: hotel.guestRatings.comfort },
                      { label: 'Value', score: hotel.guestRatings.value },
                    ].map((item) => (
                      <span key={item.label} className="text-[9px] text-gray-500 dark:text-gray-400">
                        {item.label} <span className="font-semibold text-gray-700 dark:text-gray-200">{item.score}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function Hotels({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip } = useItineraryScreen(id);

  // Search query state — drives a new Foursquare fetch when submitted
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const hotels = useHotels(id, activeSearchQuery);

  // Filter state — lifted so filters actually apply
  const [filters, setFilters] = useState<HotelFilters>({
    sortBy: 'recommended',
    priceRange: [0, 500],
    starFilter: [],
    amenityFilter: [],
    brandFilter: [],
  });

  // Derive trip dates for default check-in/check-out
  const defaultCheckIn = trip?.start_date ?? new Date().toISOString().slice(0, 10);
  const defaultCheckOut = trip?.end_date ?? new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

  // Apply filters + sort via useMemo
  const filteredHotels = useMemo(() => {
    let result = [...hotels];

    // Star filter
    if (filters.starFilter.length > 0) {
      result = result.filter((h) => filters.starFilter.includes(h.stars));
    }

    // Price range filter
    const [minPrice, maxPrice] = filters.priceRange;
    if (minPrice > 0 || maxPrice < 500) {
      result = result.filter((h) => h.price >= minPrice && h.price <= maxPrice);
    }

    // Amenity filter — hotel must have ALL selected amenities
    if (filters.amenityFilter.length > 0) {
      result = result.filter((h) =>
        filters.amenityFilter.every((a) => h.amenities.includes(a)),
      );
    }

    // Sort
    switch (filters.sortBy) {
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'stars':
        result.sort((a, b) => b.stars - a.stars);
        break;
      // 'recommended' = default order from API
    }

    return result;
  }, [hotels, filters]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [browsingOpen, setBrowsingOpen] = useState(true);
  const [bookedHotel, setBookedHotel] = useState<HotelData | null>(null);
  const [justSelected, setJustSelected] = useState(false);
  const bookedRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    setActiveSearchQuery(searchInput);
  };

  const handleSelect = (hotel: HotelData) => {
    setBookedHotel(hotel);
    setBrowsingOpen(false);
    setJustSelected(true);
    // Scroll to booked card after render
    setTimeout(() => {
      bookedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => setJustSelected(false), 1500);
    }, 100);
  };

  const handleCancel = () => {
    setBookedHotel(null);
    setBrowsingOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Search / Filter Bar */}
      <HotelSearchFilter
        isOpen={searchOpen}
        onToggle={() => setSearchOpen(!searchOpen)}
        filters={filters}
        onFiltersChange={setFilters}
        searchQuery={searchInput}
        onSearchQueryChange={setSearchInput}
        onSearch={handleSearch}
        defaultCheckIn={defaultCheckIn}
        defaultCheckOut={defaultCheckOut}
        destination={trip?.destination ?? ''}
      />

      {/* Section 2: Browsing Hotels */}
      <BrowsingHotelsSection
        hotels={filteredHotels}
        isOpen={browsingOpen}
        onToggle={() => setBrowsingOpen(!browsingOpen)}
        onSelect={handleSelect}
      />

      {/* Section 3: Booked Hotel Card */}
      <AnimatePresence>
        {bookedHotel && (
          <motion.div
            ref={bookedRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={justSelected ? 'ring-2 ring-emerald-400/50 rounded-xl transition-shadow duration-1000' : ''}
          >
            <BookedHotelCard hotel={bookedHotel} onCancel={handleCancel} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
