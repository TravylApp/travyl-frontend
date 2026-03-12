'use client';

import { Sun, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react';

interface WeatherPreviewProps {
  destination: string;
  startDate: string;
  /** Temperature in Fahrenheit */
  highTemp?: number;
  lowTemp?: number;
  condition?: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
}

const WEATHER_ICONS = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  windy: Wind,
};

const WEATHER_COLORS = {
  sunny: 'text-amber-500',
  cloudy: 'text-gray-400',
  rainy: 'text-blue-400',
  snowy: 'text-blue-200',
  windy: 'text-gray-500',
};

export function WeatherPreview({
  destination,
  startDate,
  highTemp = 75,
  lowTemp = 60,
  condition = 'sunny',
}: WeatherPreviewProps) {
  const now = new Date();
  const start = new Date(startDate + 'T00:00:00');
  const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Only show weather for trips within 14 days
  if (daysUntilStart > 14 || daysUntilStart < 0) {
    return null;
  }

  const Icon = WEATHER_ICONS[condition];
  const iconColor = WEATHER_COLORS[condition];

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Icon size={14} className={iconColor} />
      <span className="font-medium text-gray-700">{highTemp}°</span>
      <span className="text-gray-400">/</span>
      <span className="text-gray-500">{lowTemp}°</span>
    </div>
  );
}

/** Helper to get mock weather data based on destination */
export function getMockWeather(destination: string): {
  highTemp: number;
  lowTemp: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
} {
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
