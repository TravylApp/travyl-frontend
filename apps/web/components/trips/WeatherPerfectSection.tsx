'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, MapPin, Thermometer } from 'lucide-react';
import type { MockTripCard } from '@travyl/shared';
import { EASE_OUT_EXPO } from '@travyl/shared';

interface WeatherData {
  highTemp: number;
  lowTemp: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
}

const WEATHER_ICONS = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  windy: Wind,
};

const WEATHER_COLORS = {
  sunny: 'text-amber-400',
  cloudy: 'text-gray-400',
  rainy: 'text-blue-400',
  snowy: 'text-cyan-200',
  windy: 'text-gray-500',
};

const WEATHER_GRADIENTS = {
  sunny: 'from-amber-400 to-orange-500',
  cloudy: 'from-gray-400 to-gray-600',
  rainy: 'from-blue-400 to-blue-600',
  snowy: 'from-cyan-300 to-blue-400',
  windy: 'from-gray-400 to-gray-600',
};

// Get mock weather data based on destination
function getMockWeather(destination: string): WeatherData {
  const dest = destination.toLowerCase();

  if (dest.includes('paris') || dest.includes('barcelona')) {
    return { highTemp: 68, lowTemp: 52, condition: 'sunny' };
  }
  if (dest.includes('tokyo')) {
    return { highTemp: 72, lowTemp: 58, condition: 'cloudy' };
  }
  if (dest.includes('santorini') || dest.includes('greece')) {
    return { highTemp: 82, lowTemp: 68, condition: 'sunny' };
  }
  if (dest.includes('bali')) {
    return { highTemp: 88, lowTemp: 75, condition: 'sunny' };
  }
  if (dest.includes('swiss') || dest.includes('zermatt')) {
    return { highTemp: 35, lowTemp: 22, condition: 'snowy' };
  }

  // Default
  return { highTemp: 75, lowTemp: 60, condition: 'sunny' };
}

// Check if weather is "perfect" (ideal conditions)
function isPerfectWeather(weather: WeatherData): boolean {
  return (
    weather.condition === 'sunny' &&
    weather.highTemp >= 65 &&
    weather.highTemp <= 85
  );
}

interface WeatherPerfectCardProps {
  trip: MockTripCard;
  index: number;
}

function WeatherPerfectCard({ trip, index }: WeatherPerfectCardProps) {
  const weather = getMockWeather(trip.destination);
  const WeatherIcon = WEATHER_ICONS[weather.condition];
  const iconColor = WEATHER_COLORS[weather.condition];
  const gradient = WEATHER_GRADIENTS[weather.condition];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: EASE_OUT_EXPO }}
    >
      <Link
        href={`/trip/${trip.id}`}
        className="block group"
      >
        <div className="relative rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-300">
          {/* Image */}
          <div className="relative h-44 overflow-hidden">
            <Image
              src={trip.image}
              alt={trip.destination}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Weather Badge */}
            <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-gray-700`}>
              <WeatherIcon size={14} className={iconColor} />
              <span>{weather.highTemp}°F</span>
            </div>

            {/* Location */}
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center gap-1.5 text-white/90 text-xs mb-1">
                <MapPin size={12} />
                <span>{trip.destination}</span>
              </div>
              <h3 className="text-lg font-semibold text-white line-clamp-1">
                {trip.title}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Weather Info */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <WeatherIcon size={16} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {weather.highTemp}° / {weather.lowTemp}°F
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {weather.condition}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <Thermometer size={12} />
                <span>Ideal</span>
              </div>
            </div>

            {/* Trip dates */}
            <div className="text-xs text-gray-500">
              {new Date(trip.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' – '}
              {new Date(trip.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

interface WeatherPerfectSectionProps {
  trips: MockTripCard[];
}

export function WeatherPerfectSection({ trips }: WeatherPerfectSectionProps) {
  // Filter trips with perfect weather and take up to 6
  const perfectWeatherTrips = trips
    .map((trip) => ({ trip, weather: getMockWeather(trip.destination) }))
    .filter(({ weather }) => isPerfectWeather(weather))
    .slice(0, 6)
    .map(({ trip }) => trip);

  if (perfectWeatherTrips.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 mb-8">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Sun className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary-dark">
              Your Weather-Perfect Trips
            </h2>
            <p className="text-gray-500 text-sm">
              Destinations with ideal conditions right now
            </p>
          </div>
        </div>
      </motion.div>

      {/* Trip Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {perfectWeatherTrips.map((trip, index) => (
          <WeatherPerfectCard key={trip.id} trip={trip} index={index} />
        ))}
      </div>
    </section>
  );
}
