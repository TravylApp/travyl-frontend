/**
 * @module useWeather
 * Fetches a 7-day weather forecast for a named location.
 * Calls the /api/weather/forecast endpoint which proxies to a third-party weather API.
 * Used by the trip overview page to display weather conditions for travel dates.
 */

'use client';

import { getWebApiBase } from '../utils';
import { useQuery } from '@tanstack/react-query';
import type { WeatherForecastResponse } from '../types';


/**
 * Calls the /api/weather/forecast endpoint for a location, always requesting 7 days.
 * @param location - City name or coordinate string to retrieve the forecast for
 * @returns 7-day weather forecast data
 * @throws Error if the network response is not OK
 */
async function fetchWeatherForecast(location: string): Promise<WeatherForecastResponse> {
  const base = getWebApiBase();
  const res = await fetch(
    `${base}/api/weather/forecast?location=${encodeURIComponent(location)}&days=7`
  );
  if (!res.ok) throw new Error(`Weather forecast fetch failed: ${res.status}`);
  return res.json() as Promise<WeatherForecastResponse>;
}

/**
 * Fetches a 7-day weather forecast for a given location name.
 * Results are cached for 30 minutes; the query is skipped when location is empty.
 * @param location - City name or coordinate string (e.g. 'Paris' or '48.8566,2.3522')
 * @returns React Query result with `WeatherForecastResponse` data
 * @example
 * ```tsx
 * const { data: weather } = useWeather(trip.destination);
 * weather?.days.map(d => <DayForecast key={d.date} day={d} />);
 * ```
 */
export function useWeather(location: string) {
  return useQuery({
    queryKey: ['weather', location],
    queryFn: () => fetchWeatherForecast(location),
    enabled: !!location,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}
