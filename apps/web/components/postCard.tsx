import { Calendar, MapPin } from "lucide-react";

export interface Trip {
  id: string;
  destination: string;
  country: string;
  imageUrl: string;
  dates: string;
  description: string;
}

interface TripPostcardProps {
  trip: Trip;
}

export function TripPostcard({ trip }: TripPostcardProps) {
  return (
    <div className="group relative">
      {/* Postcard container with vintage styling */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border-8 border-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
        {/* Image section */}
        <div className="relative h-64 overflow-hidden">
          <img
            src={trip.imageUrl}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
          {/* Vintage overlay effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30"></div>
          
          {/* Destination label in vintage style */}
          <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 font-bold text-xl tracking-wider transform rotate-2 shadow-lg">
            {trip.destination.toUpperCase()}
          </div>
        </div>

        {/* Postcard details section */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
          {/* Location */}
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-lg text-gray-800">
              {trip.destination}, {trip.country}
            </h3>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-gray-600">{trip.dates}</p>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 italic leading-relaxed">
            {trip.description}
          </p>

          {/* Postcard stamp decoration */}
          <div className="mt-4 flex justify-end">
            <div className="border-4 border-dashed border-blue-400 w-16 h-16 flex items-center justify-center rounded-sm transform rotate-12">
              <div className="text-blue-600 text-xs font-bold text-center">
                TRAVEL
                <br />
                STAMP
              </div>
            </div>
          </div>
        </div>

        {/* Postcard lines decoration on the side */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-32 flex flex-col gap-2 pr-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-px bg-blue-300 opacity-40"></div>
          ))}
        </div>
      </div>

      {/* Shadow effect for depth */}
      <div className="absolute inset-0 -z-10 bg-black/10 blur-xl transform translate-y-2 translate-x-2 rounded-lg"></div>
    </div>
  );
}