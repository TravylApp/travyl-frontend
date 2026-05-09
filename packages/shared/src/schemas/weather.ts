import { z } from 'zod';
import type { WeatherCurrent, WeatherDay, WeatherForecastResponse, WeatherInfo, WeatherForecast } from '../types';

export const weatherCurrentSchema = z.object({
  temp: z.number(),
  feelslike: z.number(),
  conditions: z.string(),
  icon: z.string(),
  humidity: z.number(),
  windspeed: z.number(),
});

const _wc: WeatherCurrent = {} as z.infer<typeof weatherCurrentSchema>;
void _wc;

export const weatherDaySchema = z.object({
  date: z.string(),
  high: z.number(),
  low: z.number(),
  conditions: z.string(),
  icon: z.string(),
  precipprob: z.number(),
  sunrise: z.string(),
  sunset: z.string(),
});

const _wd: WeatherDay = {} as z.infer<typeof weatherDaySchema>;
void _wd;

export const weatherForecastResponseSchema = z.object({
  location: z.string(),
  timezone: z.string(),
  current: weatherCurrentSchema,
  forecast: z.array(weatherDaySchema),
});

const _wfr: WeatherForecastResponse = {} as z.infer<typeof weatherForecastResponseSchema>;
void _wfr;

export const weatherInfoSchema = z.object({
  destination: z.string(),
  high: z.number(),
  low: z.number(),
  unit: z.string(),
  conditions: z.string(),
});

const _wi: WeatherInfo = {} as z.infer<typeof weatherInfoSchema>;
void _wi;

export const weatherForecastSchema = z.object({
  day: z.string(),
  high: z.number(),
  low: z.number(),
  icon: z.string(),
  condition: z.string(),
});

const _wf: WeatherForecast = {} as z.infer<typeof weatherForecastSchema>;
void _wf;

// Inbound — weather query
export const weatherQuerySchema = z.object({
  destination: z.string().min(1).max(200).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).refine(
  (q) => q.destination || (q.lat != null && q.lng != null),
  { message: 'Provide either destination or lat+lng' },
);
export type WeatherQuery = z.infer<typeof weatherQuerySchema>;
