'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, ChevronDown, ChevronLeft, ChevronRight,
  Star, MapPin, Clock, Check, Wifi, Coffee, Wind, ConciergeBell,
  Dumbbell, UtensilsCrossed, Car, Waves, Phone, Mail,
  Users, Maximize2, DoorOpen, DoorClosed, Camera, X,
} from 'lucide-react';
import type { MockHotelDetail, MockHotelRoom } from '@travyl/shared';

interface HotelSectionProps {
  hotel: MockHotelDetail;
  label: string;
  isCheckIn?: boolean;
  isCheckOut?: boolean;
  collapsed?: boolean;
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'Wi-Fi': <Wifi className="w-3.5 h-3.5" />,
  'WiFi': <Wifi className="w-3.5 h-3.5" />,
  'Free WiFi': <Wifi className="w-3.5 h-3.5" />,
  'Coffee': <Coffee className="w-3.5 h-3.5" />,
  'Breakfast': <Coffee className="w-3.5 h-3.5" />,
  'AC': <Wind className="w-3.5 h-3.5" />,
  'Air Conditioning': <Wind className="w-3.5 h-3.5" />,
  'Concierge': <ConciergeBell className="w-3.5 h-3.5" />,
  '24/7 Desk': <ConciergeBell className="w-3.5 h-3.5" />,
  'Gym': <Dumbbell className="w-3.5 h-3.5" />,
  'Restaurant': <UtensilsCrossed className="w-3.5 h-3.5" />,
  'Parking': <Car className="w-3.5 h-3.5" />,
  'Pool': <Waves className="w-3.5 h-3.5" />,
};

export function HotelSection({ hotel, label, isCheckIn, isCheckOut, collapsed }: HotelSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((prev) => !prev);

  useEffect(() => {
    if (collapsed !== undefined) {
      setExpanded(!collapsed);
    }
  }, [collapsed]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setMeasuredHeight(contentRef.current.scrollHeight);
    }
  }, [expanded]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [priceOpen, setPriceOpen] = useState(false);
  const [roomsCollapsed, setRoomsCollapsed] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState(hotel.rooms.find((r) => r.isSelected)?.id || hotel.rooms[0]?.id);
  const [roomExpanded, setRoomExpanded] = useState<Record<string, boolean>>({});
  const [roomImageIndexes, setRoomImageIndexes] = useState<Record<string, number>>({});

  const selectedRoom = hotel.rooms.find((r) => r.id === selectedRoomId);
  const nights = hotel.checkOutDate && hotel.checkInDate
    ? Math.ceil((new Date(hotel.checkOutDate).getTime() - new Date(hotel.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
    : 6;
  const roomPrice = selectedRoom?.pricePerNight ?? hotel.rooms[0]?.pricePerNight ?? 0;
  const roomTotal = roomPrice * nights;
  const taxTotal = hotel.taxesAndFees
    ? (hotel.taxesAndFees.cityTax * nights) + hotel.taxesAndFees.serviceFee + (roomTotal * hotel.taxesAndFees.vat / 100)
    : 0;
  const totalCost = roomTotal + taxTotal;
  const isConfirmed = hotel.confirmationNumber && hotel.isBooked;

  return (
    <section className="mb-3.5 space-y-2">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-all"
        style={{
          background: isConfirmed
            ? 'linear-gradient(to right, #1e3a5f, rgba(30, 58, 95, 0.85))'
            : 'linear-gradient(to right, #1e3a5f, rgba(30, 58, 95, 0.8))',
        }}
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3 flex-1">
            <Building2 size={18} />
            <div className="flex-1 text-left">
              <p className="text-sm">{hotel.name}</p>
              <p className="text-xs opacity-90">
                &#9733; {hotel.rating} &bull; ${roomPrice}/night &bull; {label}
              </p>
            </div>
          </div>
          <ChevronDown
            size={20}
            className="transition-transform duration-300"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
      </button>

      {/* Expandable content */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: expanded ? `${measuredHeight + 40}px` : '0px',
          opacity: expanded ? 1 : 0,
          willChange: 'max-height, opacity',
        }}
      >
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <div className="px-4 md:px-6 py-4">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Hotel Info */}
              <div className="space-y-3">
                {/* Hotel Name & Status Badges */}
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-white text-xs px-2.5 py-1 rounded-full font-medium ${isConfirmed ? 'bg-[#1e3a5f]' : 'bg-[#60a5fa]'}`}>
                      {isConfirmed ? 'Confirmed' : 'Selected'}
                    </span>
                    <span className="flex items-center gap-0.5 bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px]">
                      <Star size={9} className="fill-blue-600 text-blue-600" />
                      <span className="font-medium">{hotel.rating}/5</span>
                      <span className="text-blue-600">({hotel.guestRatings.totalRatings})</span>
                    </span>
                    {isCheckIn && (
                      <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                        <DoorOpen size={10} />
                        Check-in Today
                      </span>
                    )}
                    {isCheckOut && (
                      <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                        <DoorClosed size={10} />
                        Check-out Today
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg md:text-xl text-gray-900">{hotel.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-gray-600">
                      Check-in: {hotel.checkInTime} &bull; Check-out: {hotel.checkOutTime}
                    </span>
                  </div>
                </div>

                {/* Mobile-only Hotel Image */}
                <div className="md:hidden w-full h-52 rounded-lg overflow-hidden shadow-md border-2 border-[#1e3a5f]/20">
                  <HotelImageBlock
                    images={hotel.images}
                    name={hotel.name}
                    currentIndex={currentImageIndex}
                    onChangeIndex={setCurrentImageIndex}
                  />
                </div>

                {/* Pricing Summary - Collapsible */}
                <div className="bg-[#1e3a5f]/5 rounded-lg overflow-hidden">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPriceOpen(!priceOpen); }}
                    className="w-full flex items-center justify-between p-3 hover:bg-[#1e3a5f]/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Total Cost</span>
                      <span className="text-xs text-gray-400">({nights} nights)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1e3a5f]">${totalCost.toFixed(2)}</span>
                      <ChevronDown size={14} className={`text-[#1e3a5f] transition-transform ${priceOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {priceOpen && (
                    <div className="px-3 pb-3 space-y-2 border-t border-[#1e3a5f]/10">
                      <div className="pt-2 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Room:</span>
                        <span className="font-medium text-[#1e3a5f]">{selectedRoom?.name ?? 'Standard'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Rate:</span>
                        <span className="font-semibold text-[#1e3a5f]">${roomPrice}/night</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{nights} nights subtotal:</span>
                        <span className="font-semibold text-[#1e3a5f]">${roomTotal.toFixed(2)}</span>
                      </div>
                      {hotel.taxesAndFees && (
                        <div className="pt-2 border-t border-[#1e3a5f]/10 space-y-1.5">
                          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Taxes & Fees</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">City Tax (${hotel.taxesAndFees.cityTax}/night)</span>
                            <span className="text-gray-900">${(hotel.taxesAndFees.cityTax * nights).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Service Fee</span>
                            <span className="text-gray-900">${hotel.taxesAndFees.serviceFee.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">VAT ({hotel.taxesAndFees.vat}%)</span>
                            <span className="text-gray-900">${(roomTotal * hotel.taxesAndFees.vat / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      <div className="pt-2 border-t border-[#1e3a5f]/20 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">Total</span>
                        <span className="font-bold text-[#1e3a5f]">${totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Room Selection - Collapsible */}
                {hotel.rooms.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={(e) => { e.stopPropagation(); setRoomsCollapsed(!roomsCollapsed); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-[#1e3a5f]" />
                        <span className="text-xs font-semibold text-gray-900">Room Options</span>
                        <span className="text-[10px] font-normal text-[#1e3a5f] bg-[#1e3a5f]/5 px-1.5 py-0.5 rounded-full border border-[#1e3a5f]/20">
                          {selectedRoom?.name ?? 'Standard Room'}
                        </span>
                      </div>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${!roomsCollapsed ? 'rotate-180' : ''}`} />
                    </button>

                    {!roomsCollapsed && (
                      <div className="px-3 pb-3 border-t border-gray-200">
                        <p className="text-[10px] text-gray-500 pt-2 pb-1">Select a room type to update your booking</p>
                        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                          {hotel.rooms.map((room, idx) => {
                            const isSelected = room.id === selectedRoomId;
                            const roomKey = `hotel-room-${room.id}`;
                            const isRoomExpanded = roomExpanded[roomKey];
                            const roomImages = room.images || [room.image];
                            const currentRoomImageIndex = roomImageIndexes[roomKey] || 0;
                            const priceDiff = room.pricePerNight - (hotel.rooms[0]?.pricePerNight ?? 0);

                            return (
                              <div key={room.id}>
                                {/* Compact room card */}
                                <div
                                  onClick={(e) => { e.stopPropagation(); setSelectedRoomId(room.id); }}
                                  className={`cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                                    isSelected ? 'border-[#1e3a5f] bg-[#1e3a5f]/5' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    {room.image && (
                                      <div
                                        className="w-20 h-20 flex-shrink-0 cursor-zoom-in relative group/thumb overflow-hidden"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRoomExpanded((prev) => ({ ...prev, [roomKey]: !prev[roomKey] }));
                                        }}
                                      >
                                        <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-all flex items-center justify-center">
                                          <Camera size={14} className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity drop-shadow-lg" />
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex-1 p-2.5 pl-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h5 className={`text-xs font-semibold ${isSelected ? 'text-[#1e3a5f]' : 'text-gray-900'}`}>
                                              {room.name}
                                            </h5>
                                            {isSelected && (
                                              <span className="bg-[#1e3a5f] text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">Current</span>
                                            )}
                                            {priceDiff > 0 && !isSelected && (
                                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">
                                                +${priceDiff}/nt
                                              </span>
                                            )}
                                          </div>
                                          {room.beds && (
                                            <div className="flex items-center gap-1 mb-1">
                                              <span className="text-[10px] text-gray-600">{room.beds}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2.5 text-[10px] text-gray-500">
                                            {room.maxGuests && (
                                              <span className="flex items-center gap-0.5">
                                                <Users size={10} /> {room.maxGuests}
                                              </span>
                                            )}
                                            {room.size && <span>{room.size}</span>}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className={`text-sm font-bold ${isSelected ? 'text-[#1e3a5f]' : 'text-gray-900'}`}>
                                            ${room.pricePerNight}
                                          </p>
                                          <p className="text-[9px] text-gray-500">per night</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded room gallery */}
                                <AnimatePresence>
                                  {isRoomExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="mt-1.5 bg-white rounded-lg border-2 border-[#1e3a5f]/20 overflow-hidden">
                                        {roomImages.length > 0 && (
                                          <div className="relative w-full h-52 group">
                                            <img
                                              src={roomImages[currentRoomImageIndex]}
                                              alt={`${room.name} - Photo ${currentRoomImageIndex + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                            {roomImages.length > 1 && (
                                              <>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRoomImageIndexes((prev) => ({
                                                      ...prev,
                                                      [roomKey]: currentRoomImageIndex === 0 ? roomImages.length - 1 : currentRoomImageIndex - 1,
                                                    }));
                                                  }}
                                                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                                >
                                                  <ChevronLeft size={14} />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRoomImageIndexes((prev) => ({
                                                      ...prev,
                                                      [roomKey]: currentRoomImageIndex === roomImages.length - 1 ? 0 : currentRoomImageIndex + 1,
                                                    }));
                                                  }}
                                                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                                >
                                                  <ChevronRight size={14} />
                                                </button>
                                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">
                                                  {currentRoomImageIndex + 1} / {roomImages.length}
                                                </div>
                                              </>
                                            )}
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setRoomExpanded((prev) => ({ ...prev, [roomKey]: false })); }}
                                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        )}
                                        {/* Thumbnail strip */}
                                        {roomImages.length > 1 && (
                                          <div className="flex gap-1 px-2.5 py-2 bg-gray-50 overflow-x-auto">
                                            {roomImages.map((img, imgIdx) => (
                                              <button
                                                key={imgIdx}
                                                onClick={(e) => { e.stopPropagation(); setRoomImageIndexes((prev) => ({ ...prev, [roomKey]: imgIdx })); }}
                                                className={`w-12 h-9 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all ${
                                                  imgIdx === currentRoomImageIndex ? 'border-[#1e3a5f] ring-1 ring-[#1e3a5f]/30' : 'border-transparent opacity-60 hover:opacity-100'
                                                }`}
                                              >
                                                <img src={img} alt={`Thumbnail ${imgIdx + 1}`} className="w-full h-full object-cover" />
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                        <div className="p-3 space-y-2.5">
                                          <div className="flex items-start justify-between">
                                            <div>
                                              <h6 className="text-xs font-semibold text-gray-900">{room.name}</h6>
                                              <p className="text-[10px] text-gray-500 mt-0.5">
                                                {room.beds} &middot; {room.size} &middot; {room.maxGuests} {(room.maxGuests ?? 0) === 1 ? 'guest' : 'guests'}
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-sm font-bold text-[#1e3a5f]">
                                                ${room.pricePerNight}<span className="text-[10px] text-gray-400 font-normal">/nt</span>
                                              </p>
                                              <p className="text-[10px] text-gray-500">${(room.pricePerNight * nights).toFixed(0)} total</p>
                                            </div>
                                          </div>
                                          {room.amenities.length > 0 && (
                                            <div>
                                              <p className="text-[10px] font-semibold text-gray-700 mb-1">Amenities</p>
                                              <div className="flex flex-wrap gap-1">
                                                {room.amenities.map((amenity, aIdx) => (
                                                  <span key={aIdx} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                    {amenity}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact & Location */}
                <div className="pt-3 border-t border-[#1e3a5f]/20 space-y-2">
                  {/* Contact Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={`tel:${hotel.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-lg border border-gray-200 hover:border-[#1e3a5f] hover:shadow-md transition-all group"
                    >
                      <Phone size={16} className="text-[#1e3a5f] group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] text-gray-700 font-medium">Call</span>
                    </a>
                    <a
                      href={`mailto:${hotel.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-lg border border-gray-200 hover:border-[#1e3a5f] hover:shadow-md transition-all group"
                    >
                      <Mail size={16} className="text-[#1e3a5f] group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] text-gray-700 font-medium">Email</span>
                    </a>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-lg border border-gray-200 hover:border-[#1e3a5f] hover:shadow-md transition-all group"
                    >
                      <MapPin size={16} className="text-[#8b6f47] group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] text-gray-700 font-medium">Map</span>
                    </button>
                  </div>

                  {/* Location */}
                  <div className="bg-white rounded-md p-2.5 border border-gray-200">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-[#8b6f47] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 leading-snug">{hotel.address}</p>
                        {hotel.neighborhood && (
                          <p className="text-[10px] text-[#1e3a5f] mt-0.5">{hotel.neighborhood}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Guest Ratings */}
                  {hotel.guestRatings && (
                    <div className="bg-white rounded-lg border border-gray-200 px-2.5 py-1.5 flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                          hotel.guestRatings.overall >= 8.5 ? 'bg-emerald-500' : hotel.guestRatings.overall >= 7 ? 'bg-[#1e3a5f]' : 'bg-orange-500'
                        }`}
                      >
                        {hotel.guestRatings.overall}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] font-semibold text-gray-900">{hotel.guestRatings.label}</span>
                          <span className="text-[9px] text-gray-400">&middot; {hotel.guestRatings.totalRatings} reviews</span>
                        </div>
                        <div className="flex flex-wrap gap-x-1.5">
                          {[
                            { label: 'Clean', score: hotel.guestRatings.cleanliness },
                            { label: 'Staff', score: hotel.guestRatings.staff },
                            { label: 'Location', score: hotel.guestRatings.location },
                            { label: 'Comfort', score: hotel.guestRatings.comfort },
                            { label: 'Value', score: hotel.guestRatings.value },
                          ].map((item) => (
                            <span key={item.label} className="text-[8px] text-gray-500">
                              {item.label} <span className="font-semibold text-gray-700">{item.score}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Hotel Image & Amenities (desktop) */}
              <div className="flex flex-col gap-3">
                {/* Hotel Image - Desktop only */}
                <div className="hidden md:block w-full h-80 rounded-lg overflow-hidden shadow-md border-2 border-[#1e3a5f]/20">
                  <HotelImageBlock
                    images={hotel.images}
                    name={hotel.name}
                    currentIndex={currentImageIndex}
                    onChangeIndex={setCurrentImageIndex}
                  />
                </div>

                {/* Key Amenities with Icons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {hotel.amenities.map((amenity) => (
                    <span key={amenity} className="flex items-center gap-1.5 text-xs text-gray-600" title={amenity}>
                      {AMENITY_ICONS[amenity] || <Star className="w-3.5 h-3.5" />}
                      {amenity}
                    </span>
                  ))}
                </div>

                {/* Confirmation + Booking — pushed to bottom to align with ratings */}
                <div className="flex items-center gap-2 mt-auto">
                  {hotel.confirmationNumber && hotel.isBooked && (
                    <div className="flex-1 min-w-0 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2">
                      <Check size={12} className="text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-emerald-600 uppercase tracking-wider font-medium">Confirmation</p>
                        <p className="text-xs font-bold text-emerald-700 font-mono truncate">{hotel.confirmationNumber}</p>
                      </div>
                    </div>
                  )}
                  <button
                    className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      hotel.isBooked
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-[#1e3a5f] text-white hover:bg-[#2d4a6f]'
                    }`}
                  >
                    {hotel.isBooked ? (
                      <>
                        <Check size={12} />
                        Booked
                      </>
                    ) : 'Book Hotel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Reusable image carousel block
function HotelImageBlock({
  images,
  name,
  currentIndex,
  onChangeIndex,
}: {
  images: string[];
  name: string;
  currentIndex: number;
  onChangeIndex: (i: number) => void;
}) {
  const [imgError, setImgError] = useState(false);

  if (!images.length || imgError) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <Building2 size={32} className="text-gray-300" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group">
      <img
        src={images[currentIndex]}
        alt={`${name} - Image ${currentIndex + 1}`}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onChangeIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onChangeIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full">
            {currentIndex + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}
