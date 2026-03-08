'use client';

import { useState } from 'react';
import {
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Users,
  Bed,
  Maximize2,
  Check,
  Phone,
  Mail,
  Map as MapIcon,
} from 'lucide-react';
import { HOTEL_SEARCH_RESULTS } from '@travyl/shared';
import type { HotelSearchResult, RoomType } from '@travyl/shared';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function ratingColor(score: number) {
  if (score >= 9) return 'bg-emerald-500';
  if (score >= 8) return 'bg-blue-500';
  return 'bg-amber-500';
}

function ratingLabel(score: number) {
  if (score >= 9.5) return 'Exceptional';
  if (score >= 9) return 'Superb';
  if (score >= 8.5) return 'Excellent';
  if (score >= 8) return 'Very Good';
  if (score >= 7) return 'Good';
  return 'Pleasant';
}

function formatEur(n: number) {
  return `\u20AC${n.toLocaleString()}`;
}

const NIGHTS = 3; // assumed trip length for price calc

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < count ? 'text-amber-400' : 'text-gray-300'}
          fill={i < count ? '#fbbf24' : 'none'}
        />
      ))}
    </span>
  );
}

function RatingBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`${ratingColor(score)} ${px} rounded-md text-white font-bold`}>
      {score.toFixed(1)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Image Carousel                                                    */
/* ------------------------------------------------------------------ */

function ImageCarousel({
  images,
  index,
  onPrev,
  onNext,
}: {
  images: string[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="relative w-full h-full min-h-[260px] rounded-xl overflow-hidden group">
      <img
        src={images[index]}
        alt="Hotel"
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <ChevronRight size={16} />
          </button>
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            {index + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Room Row                                                          */
/* ------------------------------------------------------------------ */

function RoomRow({
  room,
  isSelected,
  onSelect,
}: {
  room: RoomType;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-300'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-900">{room.type}</span>
        {isSelected && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
            <Check size={10} /> Selected
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1"><Bed size={12} /> {room.beds}</span>
        <span className="inline-flex items-center gap-1"><Users size={12} /> {room.guests} guests</span>
        {room.size && <span className="inline-flex items-center gap-1"><Maximize2 size={12} /> {room.size}</span>}
        <span className="ml-auto text-sm font-bold text-gray-900">{formatEur(room.price)}<span className="text-xs font-normal text-gray-500">/night</span></span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Price Breakdown                                                   */
/* ------------------------------------------------------------------ */

function PriceBreakdown({
  room,
  hotel,
}: {
  room: RoomType;
  hotel: HotelSearchResult;
}) {
  const nightly = room.price;
  const taxes = hotel.taxesAndFees;
  const cityTax = (taxes?.cityTax ?? 0) * NIGHTS;
  const serviceFee = taxes?.serviceFee ?? 0;
  const subtotal = nightly * NIGHTS + cityTax + serviceFee;
  const vat = taxes?.vat ? Math.round(subtotal * (taxes.vat / 100)) : 0;
  const total = subtotal + vat;

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
      <h4 className="font-semibold text-gray-900 mb-2">Price Breakdown</h4>
      <div className="flex justify-between text-gray-600">
        <span>{formatEur(nightly)} x {NIGHTS} nights</span>
        <span>{formatEur(nightly * NIGHTS)}</span>
      </div>
      {cityTax > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>City tax</span>
          <span>{formatEur(cityTax)}</span>
        </div>
      )}
      {serviceFee > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>Service fee</span>
          <span>{formatEur(serviceFee)}</span>
        </div>
      )}
      {vat > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>VAT ({taxes!.vat}%)</span>
          <span>{formatEur(vat)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
        <span>Total</span>
        <span>{formatEur(total)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guest Ratings                                                     */
/* ------------------------------------------------------------------ */

function GuestRatings({ hotel }: { hotel: HotelSearchResult }) {
  if (!hotel.guestRatings) return null;
  const { overall, categories } = hotel.guestRatings;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <RatingBadge score={overall} />
        <div>
          <span className="text-sm font-semibold text-gray-900">{ratingLabel(overall)}</span>
          <span className="text-xs text-gray-500 ml-1.5">{hotel.reviews.toLocaleString()} reviews</span>
        </div>
      </div>
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.label} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-gray-600">{cat.label}</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${ratingColor(cat.score)}`}
                style={{ width: `${(cat.score / 10) * 100}%` }}
              />
            </div>
            <span className="w-7 text-right font-medium text-gray-700">{cat.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Booking Confirmation                                              */
/* ------------------------------------------------------------------ */

function BookingConfirmation({
  hotel,
  room,
  onClose,
}: {
  hotel: HotelSearchResult;
  room: RoomType;
  onClose: () => void;
}) {
  const bookingNumber = `TRV-${hotel.id}${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500 flex items-center justify-center">
        <Check size={24} className="text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">Booking Confirmed!</h3>
      <p className="text-sm text-gray-600">
        Your reservation at <span className="font-semibold">{hotel.name}</span> has been confirmed.
      </p>
      <div className="inline-block bg-white rounded-lg px-4 py-2 border border-emerald-200">
        <span className="text-xs text-gray-500 block">Booking Number</span>
        <span className="text-base font-bold text-emerald-700 tracking-wide">{bookingNumber}</span>
      </div>
      <p className="text-xs text-gray-500">
        {room.type} &middot; {NIGHTS} nights &middot; {formatEur(room.price)}/night
      </p>
      {(hotel.phone || hotel.email) && (
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-1">
          {hotel.phone && (
            <span className="inline-flex items-center gap-1"><Phone size={12} />{hotel.phone}</span>
          )}
          {hotel.email && (
            <span className="inline-flex items-center gap-1"><Mail size={12} />{hotel.email}</span>
          )}
        </div>
      )}
      <button
        onClick={onClose}
        className="mt-2 px-5 py-2 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Selected Hotel Detail Card                                        */
/* ------------------------------------------------------------------ */

function SelectedHotelDetail({
  hotel,
  roomIndex,
  imageIndex,
  onRoomSelect,
  onImagePrev,
  onImageNext,
  onBook,
  onDeselect,
  booked,
  onBookClose,
}: {
  hotel: HotelSearchResult;
  roomIndex: number;
  imageIndex: number;
  onRoomSelect: (i: number) => void;
  onImagePrev: () => void;
  onImageNext: () => void;
  onBook: () => void;
  onDeselect: () => void;
  booked: boolean;
  onBookClose: () => void;
}) {
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const selectedRoom = hotel.roomTypes[roomIndex] ?? hotel.roomTypes[0];

  if (booked) {
    return <BookingConfirmation hotel={hotel} room={selectedRoom} onClose={onBookClose} />;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left column — info */}
        <div className="p-5 space-y-5 order-2 md:order-1">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{hotel.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Stars count={hotel.stars} />
                  <RatingBadge score={hotel.rating} />
                  <span className="text-xs text-gray-500">{ratingLabel(hotel.rating)}</span>
                </div>
              </div>
              <button
                onClick={onDeselect}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <MapPin size={12} />
              <span>{hotel.address}</span>
            </div>
            {hotel.distance && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                <MapIcon size={12} />
                <span>{hotel.distance}</span>
              </div>
            )}
          </div>

          {/* Room Types */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Room Types</h4>
            <div className="space-y-2">
              {hotel.roomTypes.map((room, i) => (
                <RoomRow
                  key={room.type}
                  room={room}
                  isSelected={i === roomIndex}
                  onSelect={() => onRoomSelect(i)}
                />
              ))}
            </div>
          </div>

          {/* Price Breakdown Toggle */}
          <div>
            <button
              onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showPriceBreakdown ? 'Hide price breakdown' : 'Show price breakdown'}
            </button>
            {showPriceBreakdown && (
              <div className="mt-2">
                <PriceBreakdown room={selectedRoom} hotel={hotel} />
              </div>
            )}
          </div>

          {/* Guest Ratings */}
          {hotel.guestRatings && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Guest Ratings</h4>
              <GuestRatings hotel={hotel} />
            </div>
          )}

          {/* Book Button */}
          <button
            onClick={onBook}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Book Hotel &middot; {formatEur(selectedRoom.price)}/night
          </button>
        </div>

        {/* Right column — image */}
        <div className="order-1 md:order-2 h-[240px] md:h-auto">
          <ImageCarousel
            images={hotel.images}
            index={imageIndex}
            onPrev={onImagePrev}
            onNext={onImageNext}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact Hotel Card (list item)                                    */
/* ------------------------------------------------------------------ */

function CompactHotelCard({
  hotel,
  isSelected,
  onSelect,
}: {
  hotel: HotelSearchResult;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex gap-3 p-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-200'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
        <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{hotel.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Stars count={hotel.stars} />
              <RatingBadge score={hotel.rating} size="sm" />
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-bold text-gray-900">{formatEur(hotel.price)}</span>
            <span className="text-[10px] text-gray-500 block">/night</span>
          </div>
        </div>

        {/* Amenity chips */}
        <div className="flex flex-wrap gap-1 mt-2">
          {hotel.amenities.slice(0, 3).map((a) => (
            <span
              key={a}
              className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"
            >
              {a}
            </span>
          ))}
          {hotel.amenities.length > 3 && (
            <span className="text-[10px] text-gray-400">
              +{hotel.amenities.length - 3}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function HotelListView() {
  const hotels = HOTEL_SEARCH_RESULTS;

  const [selectedHotelIndex, setSelectedHotelIndex] = useState<number | null>(null);
  const [selectedRoomMap, setSelectedRoomMap] = useState<Record<number, number>>({});
  const [imageIndexMap, setImageIndexMap] = useState<Record<number, number>>({});
  const [bookedHotelId, setBookedHotelId] = useState<number | null>(null);

  const selectedHotel = selectedHotelIndex !== null ? hotels[selectedHotelIndex] : null;

  /* Room selection */
  const getRoom = (hotelIdx: number) => selectedRoomMap[hotelIdx] ?? 0;
  const setRoom = (hotelIdx: number, roomIdx: number) =>
    setSelectedRoomMap((prev) => ({ ...prev, [hotelIdx]: roomIdx }));

  /* Image carousel */
  const getImage = (hotelIdx: number) => imageIndexMap[hotelIdx] ?? 0;
  const prevImage = (hotelIdx: number) => {
    const hotel = hotels[hotelIdx];
    setImageIndexMap((prev) => ({
      ...prev,
      [hotelIdx]: ((prev[hotelIdx] ?? 0) - 1 + hotel.images.length) % hotel.images.length,
    }));
  };
  const nextImage = (hotelIdx: number) => {
    const hotel = hotels[hotelIdx];
    setImageIndexMap((prev) => ({
      ...prev,
      [hotelIdx]: ((prev[hotelIdx] ?? 0) + 1) % hotel.images.length,
    }));
  };

  /* Booking */
  const handleBook = (hotelId: number) => setBookedHotelId(hotelId);
  const handleBookClose = () => {
    setBookedHotelId(null);
    setSelectedHotelIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Browse Hotels</h3>
        <span className="text-xs text-gray-400">{hotels.length} results</span>
      </div>

      {/* Selected hotel detail */}
      {selectedHotel && selectedHotelIndex !== null && (
        <SelectedHotelDetail
          hotel={selectedHotel}
          roomIndex={getRoom(selectedHotelIndex)}
          imageIndex={getImage(selectedHotelIndex)}
          onRoomSelect={(i) => setRoom(selectedHotelIndex, i)}
          onImagePrev={() => prevImage(selectedHotelIndex)}
          onImageNext={() => nextImage(selectedHotelIndex)}
          onBook={() => handleBook(selectedHotel.id)}
          onDeselect={() => setSelectedHotelIndex(null)}
          booked={bookedHotelId === selectedHotel.id}
          onBookClose={handleBookClose}
        />
      )}

      {/* Hotel list */}
      <div className="space-y-2">
        {hotels.map((hotel, i) => (
          <CompactHotelCard
            key={hotel.id}
            hotel={hotel}
            isSelected={selectedHotelIndex === i}
            onSelect={() => setSelectedHotelIndex(selectedHotelIndex === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}
