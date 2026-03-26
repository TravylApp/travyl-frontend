import { NextRequest, NextResponse } from 'next/server'
import type { DestinationDetail } from '@travyl/shared'

// ─── Hardcoded destination metadata ───────────────────────────────────────────

const DESTINATIONS: Record<string, DestinationDetail> = {
  'paris': {
    name: 'Paris',
    country: 'France',
    description: 'Paris, the City of Light, is renowned for its art, fashion, gastronomy, and culture. Home to iconic landmarks like the Eiffel Tower, the Louvre, and Notre-Dame, it remains one of the most visited cities in the world. Its elegant boulevards, world-class museums, and vibrant café culture make it an endlessly captivating destination.',
    language: 'French',
    currency: 'Euro (EUR)',
    timezone: 'CET / UTC+1',
    bestTimeToVisit: 'April – June, September – October',
    budgetLevel: 3,
    tags: ['Art & Culture', 'Romance', 'Cuisine', 'Fashion', 'Museums', 'History'],
    latitude: 48.8566,
    longitude: 2.3522,
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
  },
  'london': {
    name: 'London',
    country: 'United Kingdom',
    description: 'London is a world-class city blending centuries of history with a dynamic modern energy. From the Tower of London and Buckingham Palace to cutting-edge art galleries and a thriving street food scene, there is something for every traveller. Its diverse neighbourhoods, iconic red buses, and the River Thames make it instantly recognisable.',
    language: 'English',
    currency: 'British Pound (GBP)',
    timezone: 'GMT / UTC+0',
    bestTimeToVisit: 'June – August, September – October',
    budgetLevel: 4,
    tags: ['History', 'Theatre', 'Museums', 'Parks', 'Shopping', 'Pubs'],
    latitude: 51.5074,
    longitude: -0.1278,
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80',
  },
  'tokyo': {
    name: 'Tokyo',
    country: 'Japan',
    description: 'Tokyo is a mesmerising blend of the ultra-modern and the deeply traditional. Futuristic skyscrapers stand alongside ancient temples, and the city\'s food scene is unmatched — it holds more Michelin stars than any other city in the world. From the neon-lit streets of Shinjuku to the tranquil gardens of Shinjuku Gyoen, Tokyo never fails to surprise.',
    language: 'Japanese',
    currency: 'Japanese Yen (JPY)',
    timezone: 'JST / UTC+9',
    bestTimeToVisit: 'March – May, October – November',
    budgetLevel: 3,
    tags: ['Technology', 'Anime', 'Cuisine', 'Temples', 'Shopping', 'Cherry Blossoms'],
    latitude: 35.6762,
    longitude: 139.6503,
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80',
  },
  'new york': {
    name: 'New York',
    country: 'United States',
    description: 'New York City is the ultimate metropolis — a place that never sleeps and perpetually reinvents itself. The skyline is iconic, the neighbourhoods are endlessly varied, and the cultural institutions are world-leading. From the neon glow of Times Square to the peaceful pathways of Central Park, NYC offers an unparalleled urban experience.',
    language: 'English',
    currency: 'US Dollar (USD)',
    timezone: 'EST / UTC−5',
    bestTimeToVisit: 'April – June, September – November',
    budgetLevel: 4,
    tags: ['City Life', 'Museums', 'Broadway', 'Skyline', 'Food', 'Fashion'],
    latitude: 40.7128,
    longitude: -74.006,
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80',
  },
  'rome': {
    name: 'Rome',
    country: 'Italy',
    description: 'Rome, the Eternal City, is an open-air museum where ancient ruins and Renaissance masterpieces coexist with vibrant street life. The Colosseum, the Vatican, and the Trevi Fountain draw millions of visitors each year, yet the city\'s back streets and neighbourhood trattorias retain an irresistible authenticity. Few cities carry the weight of history as gracefully as Rome.',
    language: 'Italian',
    currency: 'Euro (EUR)',
    timezone: 'CET / UTC+1',
    bestTimeToVisit: 'April – June, September – October',
    budgetLevel: 3,
    tags: ['History', 'Archaeology', 'Art', 'Cuisine', 'Architecture', 'Vatican'],
    latitude: 41.9028,
    longitude: 12.4964,
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80',
  },
  'barcelona': {
    name: 'Barcelona',
    country: 'Spain',
    description: 'Barcelona is a city that seduces with its unique architecture, sun-drenched beaches, and exuberant street life. Gaudí\'s surreal masterpieces — the Sagrada Família, Park Güell, and Casa Batlló — make it unlike anywhere else on earth. Add world-class tapas, FC Barcelona, and a buzzing nightlife and you have one of Europe\'s most beloved cities.',
    language: 'Catalan / Spanish',
    currency: 'Euro (EUR)',
    timezone: 'CET / UTC+1',
    bestTimeToVisit: 'May – June, September – October',
    budgetLevel: 3,
    tags: ['Architecture', 'Beach', 'Nightlife', 'Tapas', 'Gaudí', 'Football'],
    latitude: 41.3874,
    longitude: 2.1686,
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1200&q=80',
  },
  'dubai': {
    name: 'Dubai',
    country: 'United Arab Emirates',
    description: 'Dubai is a city of superlatives — the tallest building, the largest mall, the most ambitious artificial islands. What was once a modest fishing village has transformed into a global hub of luxury, commerce, and innovation in just a few decades. Beyond the glittering skyline, the old quarter of Al Fahidi and the spice souks offer a glimpse into the city\'s heritage.',
    language: 'Arabic',
    currency: 'UAE Dirham (AED)',
    timezone: 'GST / UTC+4',
    bestTimeToVisit: 'November – March',
    budgetLevel: 4,
    tags: ['Luxury', 'Shopping', 'Desert', 'Architecture', 'Modern', 'Beaches'],
    latitude: 25.2048,
    longitude: 55.2708,
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80',
  },
  'sydney': {
    name: 'Sydney',
    country: 'Australia',
    description: 'Sydney is Australia\'s most iconic city, framed by a magnificent harbour and spectacular beaches. The Opera House and Harbour Bridge are two of the world\'s most recognisable structures, while Bondi Beach, the Blue Mountains, and the city\'s thriving food and arts scene ensure there is always more to explore. Sydney radiates an easy-going confidence that is uniquely Australian.',
    language: 'English',
    currency: 'Australian Dollar (AUD)',
    timezone: 'AEDT / UTC+11',
    bestTimeToVisit: 'September – November, March – May',
    budgetLevel: 3,
    tags: ['Harbour', 'Beaches', 'Outdoors', 'Wildlife', 'Surfing', 'Culture'],
    latitude: -33.8688,
    longitude: 151.2093,
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80',
  },
  'bangkok': {
    name: 'Bangkok',
    country: 'Thailand',
    description: 'Bangkok is a city of contrasts: gleaming temples and street food stalls, luxury malls and backpacker hostels, solemn Buddhist monks and outrageous nightlife. The Grand Palace, Wat Pho, and the floating markets are must-sees, while the city\'s incredible street food scene is arguably the best in the world. Bangkok rewards those who venture off the beaten path.',
    language: 'Thai',
    currency: 'Thai Baht (THB)',
    timezone: 'ICT / UTC+7',
    bestTimeToVisit: 'November – February',
    budgetLevel: 1,
    tags: ['Temples', 'Street Food', 'Nightlife', 'Floating Markets', 'Shopping', 'Culture'],
    latitude: 13.7563,
    longitude: 100.5018,
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=80',
  },
  'amsterdam': {
    name: 'Amsterdam',
    country: 'Netherlands',
    description: 'Amsterdam enchants visitors with its picturesque canal ring, historic gabled houses, and world-class museums. The Rijksmuseum, the Van Gogh Museum, and the Anne Frank House are cultural cornerstones, while the city\'s lively café culture and cycling-friendly streets give it a uniquely liveable, human-scale charm. Few cities are as beautiful to simply wander.',
    language: 'Dutch',
    currency: 'Euro (EUR)',
    timezone: 'CET / UTC+1',
    bestTimeToVisit: 'April – May, September – October',
    budgetLevel: 3,
    tags: ['Canals', 'Cycling', 'Museums', 'Tulips', 'History', 'Nightlife'],
    latitude: 52.3676,
    longitude: 4.9041,
    image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&q=80',
  },
  'istanbul': {
    name: 'Istanbul',
    country: 'Turkey',
    description: 'Istanbul is the only city in the world that straddles two continents, and its history reflects that unique position at the crossroads of Europe and Asia. The Hagia Sophia, the Blue Mosque, and the Grand Bazaar are monuments to successive civilisations, while the city\'s bosphorus views, hamams, and vibrant street food scene are thoroughly modern pleasures.',
    language: 'Turkish',
    currency: 'Turkish Lira (TRY)',
    timezone: 'TRT / UTC+3',
    bestTimeToVisit: 'April – May, September – November',
    budgetLevel: 2,
    tags: ['History', 'Architecture', 'Bazaars', 'Bosphorus', 'Culture', 'Cuisine'],
    latitude: 41.0082,
    longitude: 28.9784,
    image: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=1200&q=80',
  },
  'singapore': {
    name: 'Singapore',
    country: 'Singapore',
    description: 'Singapore is a remarkably compact city-state that punches far above its weight on every measure — cuisine, gardens, architecture, and connectivity. The futuristic Gardens by the Bay, the colonial heritage of Chinatown and Little India, and a food culture that spans hawker centres to Michelin-starred restaurants make it one of Asia\'s most rewarding stops.',
    language: 'English / Mandarin / Malay / Tamil',
    currency: 'Singapore Dollar (SGD)',
    timezone: 'SGT / UTC+8',
    bestTimeToVisit: 'February – April, November – December',
    budgetLevel: 4,
    tags: ['Gardens', 'Food', 'Modern Architecture', 'Culture', 'Clean', 'Shopping'],
    latitude: 1.3521,
    longitude: 103.8198,
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&q=80',
  },
  'lisbon': {
    name: 'Lisbon',
    country: 'Portugal',
    description: 'Lisbon is one of Europe\'s most captivating capitals — a sun-soaked city of hills, trams, and faded grandeur that has quietly become one of the continent\'s most desirable destinations. Fado music drifts from neighbourhood bars, pastel de nata pastries beckon from every corner café, and the views from its many miradouros are simply breathtaking.',
    language: 'Portuguese',
    currency: 'Euro (EUR)',
    timezone: 'WET / UTC+0',
    bestTimeToVisit: 'March – May, September – October',
    budgetLevel: 2,
    tags: ['Trams', 'Fado', 'Seafood', 'Architecture', 'Hills', 'Tiles'],
    latitude: 38.7223,
    longitude: -9.1393,
    image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80',
  },
  'prague': {
    name: 'Prague',
    country: 'Czech Republic',
    description: 'Prague is arguably Europe\'s most perfectly preserved medieval city, its Old Town a fairy-tale warren of cobbled lanes, Gothic spires, and Baroque palaces. The Astronomical Clock, Charles Bridge at dawn, and the Castle district are unforgettable sights, while the city\'s craft beer scene and vibrant arts culture add a contemporary dimension.',
    language: 'Czech',
    currency: 'Czech Koruna (CZK)',
    timezone: 'CET / UTC+1',
    bestTimeToVisit: 'May – June, September – October',
    budgetLevel: 2,
    tags: ['Medieval', 'Architecture', 'Beer', 'History', 'Romance', 'Christmas Markets'],
    latitude: 50.0755,
    longitude: 14.4378,
    image: 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200&q=80',
  },
  'berlin': {
    name: 'Berlin',
    country: 'Germany',
    description: 'Berlin is a city that has reinvented itself repeatedly, and the energy of that transformation is palpable on every street corner. The remnants of the Wall, the Holocaust Memorial, and the DDR Museum bear witness to a turbulent past, while the city\'s legendary nightlife, world-class galleries, and thriving start-up scene make it one of Europe\'s most exciting capitals.',
    language: 'German',
    currency: 'Euro (EUR)',
    timezone: 'CET / UTC+1',
    bestTimeToVisit: 'May – September',
    budgetLevel: 2,
    tags: ['History', 'Nightlife', 'Art', 'Wall', 'Music', 'Culture'],
    latitude: 52.52,
    longitude: 13.405,
    image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200&q=80',
  },
  'bali': {
    name: 'Bali',
    country: 'Indonesia',
    description: 'Bali is Indonesia\'s crown jewel — an island of extraordinary beauty where terraced rice paddies, ancient Hindu temples, and pristine beaches exist in remarkable harmony. Ubud\'s arts and wellness scene, Seminyak\'s beach clubs, and the surf breaks of Canggu and Uluwatu attract a hugely diverse range of travellers. The Balinese culture and spirituality infuse the island with a unique energy.',
    language: 'Balinese / Indonesian',
    currency: 'Indonesian Rupiah (IDR)',
    timezone: 'WITA / UTC+8',
    bestTimeToVisit: 'April – October',
    budgetLevel: 1,
    tags: ['Beach', 'Temples', 'Rice Terraces', 'Surf', 'Wellness', 'Spirituality'],
    latitude: -8.4095,
    longitude: 115.1889,
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
  },
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const slug = decodeURIComponent(name).toLowerCase().replace(/-/g, ' ').trim()

  // Check hardcoded data first
  const known = DESTINATIONS[slug]
  if (known) {
    return NextResponse.json(known, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  }

  // Fallback: Nominatim geocoding for unknown destinations
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(slug)}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Travyl/1.0 (travel planning app)',
        },
        signal: AbortSignal.timeout(6000),
      }
    )

    if (!geoRes.ok) {
      return NextResponse.json(null, { status: 404 })
    }

    const results: Array<{
      lat: string
      lon: string
      display_name: string
      address?: { country?: string; country_code?: string; state?: string }
    }> = await geoRes.json()

    if (!results.length) {
      return NextResponse.json(null, { status: 404 })
    }

    const result = results[0]
    const displayName = result.display_name.split(',')[0].trim()
    const country = result.address?.country ?? null

    const fallback: DestinationDetail = {
      name: displayName,
      country: country ?? '',
      description: `Discover ${displayName}${country ? `, ${country}` : ''} — explore its attractions, culture, and hidden gems.`,
      language: '',
      currency: '',
      timezone: '',
      bestTimeToVisit: '',
      budgetLevel: 2,
      tags: [],
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      image: '',
    }

    return NextResponse.json(fallback, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return NextResponse.json(null, { status: 404 })
  }
}
