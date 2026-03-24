import type { TripContextData } from '@travyl/shared';

/**
 * Enrich a trip with context data from multiple APIs.
 * Call after trip creation to populate hero image, weather, wiki, etc.
 * Returns the enriched trip_context — caller is responsible for saving to Supabase.
 */

const COUNTRY_CUISINE: Record<string, string> = {
  France: 'French', Spain: 'Spanish', Italy: 'Italian', Japan: 'Japanese',
  Mexico: 'Mexican', India: 'Indian', China: 'Chinese', Thailand: 'Thai',
  Morocco: 'Moroccan', Turkey: 'Turkish', Greece: 'Greek', Vietnam: 'Vietnamese',
  UK: 'British', USA: 'American', Canada: 'Canadian', Ireland: 'Irish',
  Portugal: 'Portuguese', Brazil: 'Brazilian', Egypt: 'Egyptian', Poland: 'Polish',
  Germany: 'German', Netherlands: 'Dutch', Sweden: 'Swedish', Norway: 'Norwegian',
  Argentina: 'Argentinian', Colombia: 'Colombian', Peru: 'Peruvian', Chile: 'Chilean',
};

interface EnrichParams {
  city: string;
  country: string;
  lat: number;
  lng: number;
  durationDays: number;
  composition?: string;
  interests?: string[];
}

export async function enrichTripContext(params: EnrichParams): Promise<TripContextData> {
  const { city, country, lat, lng, durationDays, composition, interests } = params;
  const dest = `${city}, ${country}`;
  const cuisineArea = COUNTRY_CUISINE[country] ?? '';

  // Fetch explore items (3 categories in parallel)
  let exploreItems: NonNullable<TripContextData['explore_items']> = [];
  // Try backend places API first
  try {
    const cats = ['sightseeing', 'restaurant', 'museum'];
    const results = await Promise.all(
      cats.map(async (cat) => {
        const r = await fetch(`/api/places?lat=${lat}&lng=${lng}&category=${cat}&limit=4`);
        return r.ok ? r.json() : [];
      })
    );
    const seen = new Set<string>();
    exploreItems = results.flat().filter((p: any) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).map((p: any) => ({
      id: p.id,
      title: p.name,
      description: p.description || p.tagline || p.category,
      category: p.category,
      image: p.image,
    }));
  } catch {}

  // Fallback: Foursquare if backend returned nothing
  if (exploreItems.length === 0 && lat && lng) {
    try {
      const fsCats = ['attraction', 'restaurant', 'museum'];
      const results = await Promise.all(
        fsCats.map(async (cat) => {
          const r = await fetch(`/api/foursquare?lat=${lat}&lng=${lng}&category=${cat}&limit=4`);
          return r.ok ? r.json() : [];
        })
      );
      const seen = new Set<string>();
      exploreItems = results.flat().filter((p: any) => {
        if (!p?.id || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      }).map((p: any) => ({
        id: p.id,
        title: p.name,
        description: p.tip || p.category || 'Popular spot',
        category: p.category || 'Attraction',
        image: p.image,
      }));
    } catch {}
  }

  // Fetch all enrichment APIs in parallel
  const countryCode = country.substring(0, 2).toUpperCase();
  const [heroImageUrl, weatherData, hotelData, newsData, landmarkPhotos, countryInfo, wikiData, holidays, cuisineData, sunriseData] = await Promise.all([
    fetch(`/api/images?q=${encodeURIComponent(city)}`)
      .then(r => r.ok ? r.json().then((d: any) => d.url as string) : undefined).catch(() => undefined),
    fetch(`/api/weather?location=${encodeURIComponent(dest)}&days=${durationDays}`)
      .then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`/api/foursquare?lat=${lat}&lng=${lng}&category=hotel&limit=5`)
      .then(r => r.ok ? r.json() : []).catch(() => []),
    fetch(`/api/news?destination=${encodeURIComponent(city)}&limit=8`)
      .then(r => r.ok ? r.json() : []).catch(() => []),
    fetch(`/api/places?lat=${lat}&lng=${lng}&category=sightseeing&limit=8`)
      .then(r => r.ok ? r.json() : []).catch(() => []),
    fetch(`/api/country?name=${encodeURIComponent(country)}`)
      .then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`/api/wiki?q=${encodeURIComponent(city)}`)
      .then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`/api/holidays?country=${encodeURIComponent(countryCode)}&year=${new Date().getFullYear()}`)
      .then(r => r.ok ? r.json() : []).catch(() => []),
    cuisineArea ? fetch(`/api/cuisine?area=${encodeURIComponent(cuisineArea)}`)
      .then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
    fetch(`/api/sunrise?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const interestsStr = interests?.length ? 'Highlights include ' + interests.slice(0, 3).join(', ') + '.' : '';

  return {
    // Priority: landmark photo (geo-tagged) → explore item → wiki thumbnail → Unsplash
    hero_image_url: landmarkPhotos[0]?.image || exploreItems[0]?.image || wikiData?.thumbnail || heroImageUrl,
    hero_images: landmarkPhotos.length > 0
      ? landmarkPhotos.filter((p: any) => p.image).map((p: any) => p.image).slice(0, 8)
      : exploreItems.filter((e) => e.image).map((e) => e.image).slice(0, 6),
    lat,
    lng,
    lede_text: `A ${durationDays}-day ${composition ?? ''} trip to ${city}. ${interestsStr}`.trim(),
    explore_items: exploreItems.length > 0 ? exploreItems : undefined,
    weather: weatherData ? { current: weatherData.current, forecast: weatherData.forecast } : undefined,
    hotels: hotelData.length > 0 ? hotelData : undefined,
    news: newsData.length > 0 ? newsData : undefined,
    country: countryInfo ?? undefined,
    wiki: wikiData ?? undefined,
    holidays: holidays.length > 0 ? holidays.slice(0, 10) : undefined,
    cuisine: cuisineData.length > 0 ? cuisineData.slice(0, 6) : undefined,
    sunrise: sunriseData ?? undefined,
    quick_facts: countryInfo ? {
      currency: `${countryInfo.currency?.code} (${countryInfo.currency?.symbol})`,
      language: countryInfo.language,
      timezone: countryInfo.timezone,
      emergency: '112',
    } : undefined,
  };
}
