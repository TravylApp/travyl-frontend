'use client';

import { use, useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import type { MapLocation } from '@/components/leaflet-map';
import { useItineraryContext } from '@/components/itinerary/ItineraryContext';
import {
  Hotel, Star, ChevronDown, ChevronLeft, ChevronRight, MapPin,
  Users, Wifi, Coffee, Car, Dumbbell, Waves, Search, Minus, Plus,
  Phone, Mail, Map, X, Camera, Shield, CreditCard, Share2,
  Snowflake, UtensilsCrossed, Sparkles, LayoutGrid, List, BookOpen,
} from 'lucide-react';
import { useItineraryScreen } from '@travyl/shared';

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

const MOCK_HOTELS: HotelData[] = [
  {
    id: 'h1',
    name: 'Hotel Le Marais',
    stars: 4,
    rating: 8.9,
    reviews: 1247,
    price: 189,
    address: '16 Rue du Temple, 75004 Paris',
    neighborhood: 'Le Marais',
    lat: 48.8588,
    lng: 2.3540,
    images: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d7d9d4048?w=800',
    ],
    amenities: ['WiFi', 'Breakfast', 'Spa', 'Parking'],
    roomTypes: [
      { type: 'Classic Double', beds: '1 Queen Bed', guests: 2, size: '22m²', price: 189, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400', amenities: ['WiFi', 'AC', 'Minibar'] },
      { type: 'Superior Suite', beds: '1 King Bed', guests: 2, size: '35m²', price: 259, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', amenities: ['WiFi', 'AC', 'Minibar', 'Balcony'] },
    ],
    checkIn: '3:00 PM',
    checkOut: '11:00 AM',
    cancellation: 'Free cancellation until Mar 18',
    phone: '+33-1-42-72-34-12',
    email: 'reservations@hotelmarais.fr',
    guestRatings: { overall: 8.9, label: 'Excellent', cleanliness: 9.1, staff: 9.0, location: 9.4, comfort: 8.7, value: 8.5 },
  },
  {
    id: 'h2',
    name: 'Grand Hotel du Palais Royal',
    stars: 5,
    rating: 9.2,
    reviews: 863,
    price: 350,
    address: '4 Rue de Valois, 75001 Paris',
    neighborhood: 'Near Louvre',
    lat: 48.8634,
    lng: 2.3370,
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
    ],
    amenities: ['WiFi', 'Breakfast', 'Pool', 'Spa', 'Gym', 'Parking'],
    roomTypes: [
      { type: 'Deluxe Room', beds: '1 King Bed', guests: 2, size: '30m²', price: 350, image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400', amenities: ['WiFi', 'AC', 'Minibar', 'Safe'] },
      { type: 'Prestige Suite', beds: '1 King Bed + Sofa', guests: 3, size: '55m²', price: 520, image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400', amenities: ['WiFi', 'AC', 'Minibar', 'Lounge', 'Balcony'] },
    ],
    checkIn: '2:00 PM',
    checkOut: '12:00 PM',
    cancellation: 'Free cancellation until Mar 15',
    phone: '+33-1-42-96-15-35',
    email: 'booking@grandhotelpalaisroyal.com',
    guestRatings: { overall: 9.2, label: 'Superb', cleanliness: 9.5, staff: 9.3, location: 9.6, comfort: 9.1, value: 8.8 },
  },
  {
    id: 'h3',
    name: 'Hotel des Arts Montmartre',
    stars: 3,
    rating: 8.1,
    reviews: 2034,
    price: 120,
    address: '5 Rue Tholoze, 75018 Paris',
    neighborhood: 'Montmartre',
    lat: 48.8847,
    lng: 2.3346,
    images: [
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800',
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
    ],
    amenities: ['WiFi', 'Breakfast'],
    roomTypes: [
      { type: 'Standard Room', beds: '1 Double Bed', guests: 2, size: '18m²', price: 120, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400', amenities: ['WiFi', 'AC'] },
      { type: 'Triple Room', beds: '1 Double + 1 Single', guests: 3, size: '24m²', price: 155, image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400', amenities: ['WiFi', 'AC', 'Desk'] },
    ],
    checkIn: '2:00 PM',
    checkOut: '10:00 AM',
    cancellation: 'Free cancellation until Mar 20',
    phone: '+33-1-46-06-30-52',
    email: 'info@hoteldesartsmontmartre.fr',
    guestRatings: { overall: 8.1, label: 'Very Good', cleanliness: 8.3, staff: 8.5, location: 8.8, comfort: 7.9, value: 8.6 },
  },
  {
    id: 'h4',
    name: 'Pullman Paris Tour Eiffel',
    stars: 4,
    rating: 8.6,
    reviews: 1589,
    price: 275,
    address: '18 Avenue de Suffren, 75015 Paris',
    neighborhood: 'Trocadero',
    lat: 48.8554,
    lng: 2.2923,
    images: [
      'https://images.unsplash.com/photo-1529551739587-e242c564f727?w=800',
      'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800',
    ],
    amenities: ['WiFi', 'Breakfast', 'Pool', 'Gym', 'Parking'],
    roomTypes: [
      { type: 'Executive Room', beds: '1 King Bed', guests: 2, size: '28m²', price: 275, image: 'https://images.unsplash.com/photo-1590490360182-c33d7d9d4048?w=400', amenities: ['WiFi', 'AC', 'Minibar', 'Safe'] },
      { type: 'Panoramic Suite', beds: '1 King Bed', guests: 2, size: '45m²', price: 420, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400', amenities: ['WiFi', 'AC', 'Minibar', 'Eiffel View'] },
    ],
    checkIn: '3:00 PM',
    checkOut: '12:00 PM',
    cancellation: 'Free cancellation until Mar 17',
    phone: '+33-1-44-38-56-00',
    email: 'h3714-re@accor.com',
    guestRatings: { overall: 8.6, label: 'Excellent', cleanliness: 8.9, staff: 8.7, location: 9.2, comfort: 8.5, value: 8.0 },
  },
];

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
      <Image
        src={images[idx]}
        alt={`${alt} ${idx + 1}`}
        fill
        className="object-cover"
        sizes="(max-width:768px) 100vw, 50vw"
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

function HotelSearchFilter({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [checkIn, setCheckIn] = useState('2026-03-22');
  const [checkOut, setCheckOut] = useState('2026-03-27');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [sortBy, setSortBy] = useState('recommended');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [starFilter, setStarFilter] = useState<number[]>([]);
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);

  const toggleStar = (s: number) =>
    setStarFilter((prev) => (prev.includes(s) ? prev.filter((v) => v !== s) : [...prev, s]));
  const toggleAmenity = (a: string) =>
    setAmenityFilter((prev) => (prev.includes(a) ? prev.filter((v) => v !== a) : [...prev, a]));
  const toggleBrand = (b: string) =>
    setBrandFilter((prev) => (prev.includes(b) ? prev.filter((v) => v !== b) : [...prev, b]));
  const resetFilters = () => {
    setSortBy('recommended');
    setPriceRange([0, 500]);
    setStarFilter([]);
    setAmenityFilter([]);
    setBrandFilter([]);
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#60a5fa]/10 flex items-center justify-center">
            <Hotel size={16} className="text-[#60a5fa]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Update Hotel</p>
            <p className="text-[11px] text-gray-500">Paris, France &middot; 5 nights &middot; {guests} guests</p>
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
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-blue-100 px-4 py-3 space-y-3">
              {/* Compact search strip */}
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Check-in</label>
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full mt-0.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#60a5fa]" />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Check-out</label>
                  <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full mt-0.5 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#60a5fa]" />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Guests</label>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1.5 py-1">
                    <button onClick={() => setGuests(Math.max(1, guests - 1))} className="text-gray-400 hover:text-gray-600"><Minus size={12} /></button>
                    <span className="text-xs font-medium w-5 text-center">{guests}</span>
                    <button onClick={() => setGuests(guests + 1)} className="text-gray-400 hover:text-gray-600"><Plus size={12} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Rooms</label>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1.5 py-1">
                    <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="text-gray-400 hover:text-gray-600"><Minus size={12} /></button>
                    <span className="text-xs font-medium w-5 text-center">{rooms}</span>
                    <button onClick={() => setRooms(rooms + 1)} className="text-gray-400 hover:text-gray-600"><Plus size={12} /></button>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 bg-[#60a5fa] hover:bg-[#3b82f6] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                  <Search size={13} /> Search
                </button>
              </div>

              {/* Advanced filters */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Filters</span>
                  <button onClick={resetFilters} className="text-[11px] text-[#60a5fa] hover:underline">Reset</button>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Sort By</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#60a5fa]">
                    <option value="recommended">Recommended</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="rating">Guest Rating</option>
                    <option value="stars">Star Rating</option>
                  </select>
                </div>

                {/* Star rating */}
                <div>
                  <span className="text-xs text-gray-600">Star Rating</span>
                  <div className="flex gap-1.5 mt-1">
                    {[3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleStar(s)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          starFilter.includes(s)
                            ? 'bg-amber-400 border-amber-400 text-white'
                            : 'border-gray-200 text-gray-600 hover:border-amber-300'
                        }`}
                      >
                        {s} <Star size={9} className="inline -mt-0.5 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <span className="text-xs text-gray-600">Amenities</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {FILTER_AMENITIES.map((a) => (
                      <button
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          amenityFilter.includes(a)
                            ? 'bg-[#60a5fa] border-[#60a5fa] text-white'
                            : 'border-gray-200 text-gray-600 hover:border-[#60a5fa]/50'
                        }`}
                      >
                        {AMENITY_ICONS[a]} {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hotel brands */}
                <div>
                  <span className="text-xs text-gray-600">Hotel Brands</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {HOTEL_BRANDS.map((b) => (
                      <button
                        key={b}
                        onClick={() => toggleBrand(b)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          brandFilter.includes(b)
                            ? 'bg-[#60a5fa] border-[#60a5fa] text-white'
                            : 'border-gray-200 text-gray-600 hover:border-[#60a5fa]/50'
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

function BrowsingHotelGridCard({
  hotel,
  onSelect,
}: {
  hotel: HotelData;
  onSelect: (h: HotelData) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <ImageCarousel images={hotel.images} alt={hotel.name} height="h-44" />
      <div className="p-3.5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 truncate">{hotel.name}</h4>
            <StarRating count={hotel.stars} />
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{hotel.price}</p>
            <p className="text-[10px] text-gray-500">per night</p>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
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
          <span className="text-[11px] text-gray-600 font-medium">{hotel.guestRatings.label}</span>
          <span className="text-[10px] text-gray-400">{hotel.reviews.toLocaleString()} reviews</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {hotel.amenities.slice(0, 4).map((a) => (
            <span key={a} className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
              {AMENITY_ICONS[a]} {a}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-3">
          <button
            onClick={() => onSelect(hotel)}
            className="w-full bg-[#60a5fa] hover:bg-[#3b82f6] text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Select Hotel
          </button>
        </div>
      </div>
    </div>
  );
}

function BrowsingHotelListCard({
  hotel,
  onSelect,
}: {
  hotel: HotelData;
  onSelect: (h: HotelData) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="sm:w-60 flex-shrink-0">
        <ImageCarousel images={hotel.images} alt={hotel.name} height="h-48 sm:h-full" />
      </div>
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-gray-900">{hotel.name}</h4>
              <StarRating count={hotel.stars} />
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{hotel.price}</p>
              <p className="text-[10px] text-gray-500">per night</p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
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
            <span className="text-[11px] text-gray-600 font-medium">{hotel.guestRatings.label}</span>
            <span className="text-[10px] text-gray-400">{hotel.reviews.toLocaleString()} reviews</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {hotel.amenities.map((a) => (
              <span key={a} className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                {AMENITY_ICONS[a]} {a}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => onSelect(hotel)}
            className="bg-[#60a5fa] hover:bg-[#3b82f6] text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Select
          </button>
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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left page — large image */}
                <div className="relative">
                  <ImageCarousel images={hotel.images} alt={hotel.name} height="h-72 md:h-96" />
                  {/* Page number badge */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-gray-600 px-2.5 py-1 rounded-full shadow-sm">
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
                  <h3 className="text-xl font-bold text-gray-900">{hotel.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
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
                        <p className="text-sm font-semibold text-gray-900">{hotel.guestRatings.label}</p>
                        <p className="text-[10px] text-gray-400">{hotel.reviews.toLocaleString()} reviews</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="rounded-lg p-3 flex items-baseline justify-between" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)' }}>
                      <span className="text-sm text-gray-600">From</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{hotel.price}</span>
                        <span className="text-xs text-gray-500 ml-1">/ night</span>
                      </div>
                    </div>

                    {/* Room types preview */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Room Types</p>
                      <div className="space-y-1">
                        {hotel.roomTypes.map((room, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <div>
                              <span className="font-medium text-gray-900">{room.type}</span>
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
                        <span key={a} className="flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                          {AMENITY_ICONS[a]} {a}
                        </span>
                      ))}
                    </div>

                    {/* Check-in/out */}
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-gray-500">Check-in: <span className="font-medium text-gray-700">{hotel.checkIn}</span></span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">Check-out: <span className="font-medium text-gray-700">{hotel.checkOut}</span></span>
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
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

  // Push markers to layout map when browsing opens, clear when it closes
  useEffect(() => {
    if (isOpen) {
      setMapMarkers(mapLocations);
      setRequestMapOpen(true);
    } else {
      setMapMarkers([]);
      setSelectedMarkerId(undefined);
      setRequestMapOpen(false);
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
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <Search size={16} className="text-[#60a5fa]" />
          <span className="text-sm font-semibold text-gray-900">Browsing Hotels</span>
          <span className="text-[10px] bg-[#60a5fa]/10 text-[#60a5fa] px-2 py-0.5 rounded-full font-medium">{hotels.length} results</span>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-4 py-3">
              {/* View toggle */}
              <div className="flex items-center justify-end gap-1 mb-3">
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
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={label}
                  >
                    <Icon size={14} />
                  </button>
                ))}
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hotels.map((hotel) => (
                    <div
                      key={hotel.id}
                      onMouseEnter={() => handleHover(hotel.id)}
                      onMouseLeave={() => handleHover(null)}
                    >
                      <BrowsingHotelGridCard hotel={hotel} onSelect={onSelect} />
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
                      <BrowsingHotelListCard hotel={hotel} onSelect={onSelect} />
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
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
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

            <h3 className="text-lg font-bold text-gray-900">{hotel.name}</h3>

            {/* Check-in / check-out */}
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                <span className="text-[10px] text-blue-800 block font-medium">Check-in</span>
                <span className="text-xs font-semibold text-gray-900">Mar 22 &middot; {hotel.checkIn}</span>
              </div>
              <div className="flex-1 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
                <span className="text-[10px] text-blue-800 block font-medium">Check-out</span>
                <span className="text-xs font-semibold text-gray-900">Mar 27 &middot; {hotel.checkOut}</span>
              </div>
            </div>

            {/* Cancellation badge */}
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-medium">
              <Shield size={10} /> {hotel.cancellation}
            </span>

            {/* Pricing breakdown (collapsible) */}
            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)' }}>
              <button onClick={() => setPriceOpen(!priceOpen)} className="w-full flex items-center justify-between p-3 hover:bg-trip-base/10 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Total Cost</span>
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
                      <div className="pt-2 flex justify-between text-xs"><span className="text-gray-500">Room</span><span className="font-medium" style={{ color: 'var(--trip-base)' }}>{hotel.roomTypes[selectedRoom].type}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-600">Rate</span><span className="font-semibold" style={{ color: 'var(--trip-base)' }}>&euro;{hotel.price}/night</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-600">{nights} nights subtotal</span><span className="font-semibold" style={{ color: 'var(--trip-base)' }}>&euro;{baseTotal.toFixed(2)}</span></div>
                      <div className="pt-1.5 border-t space-y-1" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.1)' }}>
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Taxes & Fees</span>
                        <div className="flex justify-between text-xs"><span className="text-gray-600">City Tax</span><span>&euro;{cityTax.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-600">Service Fee</span><span>&euro;{serviceFee.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-600">VAT (10%)</span><span>&euro;{vat.toFixed(2)}</span></div>
                      </div>
                      <div className="pt-1.5 border-t flex justify-between" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                        <span className="text-sm font-semibold text-gray-900">Total</span>
                        <span className="font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Room options (collapsible) */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setRoomsOpen(!roomsOpen)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Hotel size={14} style={{ color: 'var(--trip-base)' }} />
                  <span className="text-xs font-semibold text-gray-900">Room Options</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color: 'var(--trip-base)', backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)', borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                    {hotel.roomTypes[selectedRoom].type}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${roomsOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {roomsOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 border-t border-gray-200 space-y-2 pt-2">
                      {hotel.roomTypes.map((room, idx) => {
                        const isSelected = selectedRoom === idx;
                        const roomKey = `room-${hotel.id}-${idx}`;
                        const priceDiff = room.price - hotel.roomTypes[0].price;
                        return (
                          <div key={idx}>
                            <div
                              onClick={() => { setSelectedRoom(idx); setExpandedRoom(null); }}
                              className={`cursor-pointer rounded-lg border-2 transition-all overflow-hidden flex items-start gap-3 ${
                                isSelected ? '' : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                              style={isSelected ? { borderColor: 'var(--trip-base)', backgroundColor: 'rgb(var(--trip-base-rgb) / 0.05)' } : undefined}
                            >
                              <div
                                className="w-20 h-20 flex-shrink-0 relative group/thumb cursor-zoom-in"
                                onClick={(e) => { e.stopPropagation(); setExpandedRoom(expandedRoom === roomKey ? null : roomKey); }}
                              >
                                <Image src={room.image} alt={room.type} fill className="object-cover" sizes="80px" />
                                <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-all flex items-center justify-center">
                                  <Camera size={14} className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow-lg" />
                                </div>
                              </div>
                              <div className="flex-1 p-2.5 pl-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className={`text-xs font-semibold ${isSelected ? '' : 'text-gray-900'}`} style={isSelected ? { color: 'var(--trip-base)' } : undefined}>{room.type}</span>
                                      {isSelected && <span className="text-white text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--trip-base)' }}>Current</span>}
                                      {priceDiff > 0 && !isSelected && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">+&euro;{priceDiff}/nt</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-600">{room.beds}</p>
                                    <div className="flex items-center gap-2.5 text-[10px] text-gray-500 mt-0.5">
                                      <span className="flex items-center gap-0.5"><Users size={10} />{room.guests}</span>
                                      <span>{room.size}</span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className={`text-sm font-bold ${isSelected ? '' : 'text-gray-900'}`} style={isSelected ? { color: 'var(--trip-base)' } : undefined}>&euro;{room.price}</p>
                                    <p className="text-[9px] text-gray-500">per night</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded room detail */}
                            <AnimatePresence>
                              {expandedRoom === roomKey && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="mt-1.5 bg-white rounded-lg border-2 overflow-hidden" style={{ borderColor: 'rgb(var(--trip-base-rgb) / 0.2)' }}>
                                    <div className="relative w-full h-48">
                                      <Image src={room.image} alt={room.type} fill className="object-cover" sizes="100%" />
                                      <button onClick={() => setExpandedRoom(null)} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"><X size={12} /></button>
                                    </div>
                                    <div className="p-3 space-y-2">
                                      <div className="flex justify-between">
                                        <div>
                                          <h6 className="text-xs font-semibold text-gray-900">{room.type}</h6>
                                          <p className="text-[10px] text-gray-500 mt-0.5">{room.beds} &middot; {room.size} &middot; {room.guests} guests</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-bold" style={{ color: 'var(--trip-base)' }}>&euro;{room.price}<span className="text-[10px] text-gray-400 font-normal">/nt</span></p>
                                          <p className="text-[10px] text-gray-500">&euro;{room.price * nights} total</p>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {room.amenities.map((a, i) => (
                                          <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{a}</span>
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
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 border border-gray-200">
              <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Booking Details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-gray-500">Confirmation #</span>
                <span className="font-medium text-gray-900">HTL-2026-{hotel.id.toUpperCase()}</span>
                <span className="text-gray-500">Property ID</span>
                <span className="font-medium text-gray-900">{hotel.id.toUpperCase()}-PAR</span>
                <span className="text-gray-500">Guest</span>
                <span className="font-medium text-gray-900">2 Adults</span>
                <span className="text-gray-500">Payment</span>
                <span className="font-medium text-gray-900 flex items-center gap-1"><CreditCard size={10} /> **** 4242</span>
              </div>
            </div>

            {/* Hotel policies (collapsible) */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setPoliciesOpen(!policiesOpen)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors">
                <span className="text-xs font-semibold text-gray-900">Hotel Policies</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${policiesOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {policiesOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 border-t border-gray-100 space-y-1.5 pt-2 text-xs text-gray-600">
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
              <button onClick={onCancel} className="flex-1 text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors">Cancel Booking</button>
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
                <span key={a} className="flex items-center gap-1.5 text-xs text-gray-600">
                  {AMENITY_ICONS[a]} {a}
                </span>
              ))}
            </div>

            {/* Contact actions */}
            <div className="grid grid-cols-3 gap-2">
              <a href={`tel:${hotel.phone}`} className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-md p-2.5 border border-gray-200 hover:border-trip-base hover:shadow-sm transition-all">
                <Phone size={14} style={{ color: 'var(--trip-base)' }} />
                <span className="text-xs text-gray-900 font-medium">Call</span>
              </a>
              <a href={`mailto:${hotel.email}`} className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-md p-2.5 border border-gray-200 hover:border-trip-base hover:shadow-sm transition-all">
                <Mail size={14} style={{ color: 'var(--trip-base)' }} />
                <span className="text-xs text-gray-900 font-medium">Email</span>
              </a>
              <button className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-md p-2.5 border border-gray-200 hover:border-trip-base hover:shadow-sm transition-all">
                <Map size={14} className="text-[#8b6f47]" />
                <span className="text-xs text-gray-900 font-medium">Map</span>
              </button>
            </div>

            {/* Location */}
            <div className="bg-white rounded-md p-2.5 border border-gray-200">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-[#8b6f47] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-900 leading-snug">{hotel.address}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--trip-base)' }}>{hotel.neighborhood}</p>
                </div>
              </div>
            </div>

            {/* Guest ratings */}
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
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
                    <span className="text-xs font-semibold text-gray-900">{hotel.guestRatings.label}</span>
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
                      <span key={item.label} className="text-[9px] text-gray-500">
                        {item.label} <span className="font-semibold text-gray-700">{item.score}</span>
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
  const { hotels, isLoading } = useItineraryScreen(id);

  const [searchOpen, setSearchOpen] = useState(false);
  const [browsingOpen, setBrowsingOpen] = useState(true);
  const [bookedHotel, setBookedHotel] = useState<HotelData | null>(MOCK_HOTELS[0]);

  const handleSelect = (hotel: HotelData) => {
    setBookedHotel(hotel);
    setBrowsingOpen(false);
  };

  const handleCancel = () => {
    setBookedHotel(null);
    setBrowsingOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Search / Filter Bar */}
      <HotelSearchFilter isOpen={searchOpen} onToggle={() => setSearchOpen(!searchOpen)} />

      {/* Section 2: Browsing Hotels */}
      <BrowsingHotelsSection
        hotels={MOCK_HOTELS}
        isOpen={browsingOpen}
        onToggle={() => setBrowsingOpen(!browsingOpen)}
        onSelect={handleSelect}
      />

      {/* Section 3: Booked Hotel Card */}
      <AnimatePresence>
        {bookedHotel && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <BookedHotelCard hotel={bookedHotel} onCancel={handleCancel} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
