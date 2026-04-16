'use client';

import { useQuery } from '@tanstack/react-query';
import type { WeatherForecastResponse } from '../types';

function getApiBase(): string {
  // Web: relative path; Mobile: env var
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

async function fetchWeatherForecast(location: string): Promise<WeatherForecastResponse> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/weather/forecast?location=${encodeURIComponent(location)}&days=7`
  );
  if (!res.ok) throw new Error(`Weather forecast fetch failed: ${res.status}`);
  return res.json() as Promise<WeatherForecastResponse>;
}

export function useWeather(location: string) {
  return useQuery({
    queryKey: ['weather', location],
    queryFn: () => fetchWeatherForecast(location),
    enabled: !!location,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
