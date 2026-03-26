export interface WmoWeather {
  icon: string  // emoji
  label: string
}

const WMO_MAP: Record<number, WmoWeather> = {
  0:  { icon: '☀️', label: 'Clear sky' },
  1:  { icon: '🌤', label: 'Mainly clear' },
  2:  { icon: '⛅', label: 'Partly cloudy' },
  3:  { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫', label: 'Fog' },
  48: { icon: '🌫', label: 'Icy fog' },
  51: { icon: '🌦', label: 'Light drizzle' },
  53: { icon: '🌦', label: 'Drizzle' },
  55: { icon: '🌧', label: 'Heavy drizzle' },
  61: { icon: '🌧', label: 'Light rain' },
  63: { icon: '🌧', label: 'Rain' },
  65: { icon: '🌧', label: 'Heavy rain' },
  71: { icon: '🌨', label: 'Light snow' },
  73: { icon: '🌨', label: 'Snow' },
  75: { icon: '❄️', label: 'Heavy snow' },
  77: { icon: '🌨', label: 'Snow grains' },
  80: { icon: '🌦', label: 'Light showers' },
  81: { icon: '🌧', label: 'Showers' },
  82: { icon: '⛈', label: 'Heavy showers' },
  85: { icon: '🌨', label: 'Snow showers' },
  86: { icon: '❄️', label: 'Heavy snow showers' },
  95: { icon: '⛈', label: 'Thunderstorm' },
  96: { icon: '⛈', label: 'Thunderstorm + hail' },
  99: { icon: '⛈', label: 'Thunderstorm + heavy hail' },
}

export function getWmoWeather(code: number | null): WmoWeather {
  if (code === null) return { icon: '🌡', label: 'Unknown' }
  return WMO_MAP[code] ?? { icon: '🌡', label: `Code ${code}` }
}
