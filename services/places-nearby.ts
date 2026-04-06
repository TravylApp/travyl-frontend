import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { validateAuth } from './lib/auth'
import type { PlaceItem } from '@travyl/shared/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlacesNearbyResponse {
  places: PlaceItem[]
  hasMore: boolean
  nextPageToken?: string
}

interface GooglePlacesResult {
  id: string
  displayName?: { text: string }
  primaryType?: string
  types?: string[]
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  priceLevel?: 'PRICE_LEVEL_UNSPECIFIED' | 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE'
  photos?: Array<{ name: string; authorAttributions?: Array<{ displayName?: string }> }>
  editorialSummary?: { text?: string }
  nationalPhoneNumber?: string
  websiteUri?: string
  regularOpeningHours?: { openNow?: boolean; periods?: Array<{ open?: { day?: number; hour?: number; minute?: number }; close?: { day?: number; hour?: number; minute?: number } }>; weekdayDescriptions?: string[] }
  priceRange?: { startPrice?: { units?: string }; endPrice?: { units?: string } }
}

interface GooglePlacesResponse {
  places?: GooglePlacesResult[]
  nextPageToken?: string
}

// ---------------------------------------------------------------------------
// Category mapping: Frontend categories → Google Places types
// ---------------------------------------------------------------------------

const CATEGORY_TO_GOOGLE_TYPES: Record<string, string[]> = {
  // Working categories (existing)
  restaurant: ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'],
  attraction: ['tourist_attraction', 'point_of_interest', 'landmark'],
  hotel: ['lodging', 'hotel'],
  nightlife: ['night_club', 'bar', 'liquor_store'],
  shopping: ['shopping_mall', 'department_store', 'store', 'clothing_store'],
  cafe: ['cafe', 'coffee_shop', 'bakery'],
  
  // Missing categories (to add)
  bar: ['bar', 'pub', 'liquor_store'],
  museum: ['museum', 'art_gallery'],
  park: ['park', 'amusement_park', 'campground'],
  beach: ['beach', 'natural_feature'],
  casino: ['casino', 'amusement_park'],
  night_club: ['night_club', 'bar', 'liquor_store'],
  spa: ['spa', 'beauty_salon', 'hair_care', 'health'],
  pool: ['swimming_pool', 'sports_complex', 'gym'],
  amusement_park: ['amusement_park', 'park'],
  bowling_alley: ['bowling_alley', 'sports_complex'],
  movie_theater: ['movie_theater', 'movie_rental'],
  zoo: ['zoo', 'amusement_park'],
  aquarium: ['aquarium', 'zoo'],
  gym: ['gym', 'fitness_center', 'sports_complex'],
  stadium: ['stadium', 'sports_complex', 'arena'],
  theater: [' performing_arts_theater', 'movie_theater'],
  library: ['library'],
  book_store: ['book_store'],
  electronics_store: ['electronics_store'],
  furniture_store: ['furniture_store'],
  hardware_store: ['hardware_store'],
  home_goods_store: ['home_goods_store'],
  jewelry_store: ['jewelry_store'],
  shoe_store: ['shoe_store'],
  supermarket: ['supermarket', 'grocery_store', 'food'],
  convenience_store: ['convenience_store', 'store'],
  pharmacy: ['pharmacy', 'drugstore', 'health'],
  dentist: ['dentist', 'health'],
  doctor: ['doctor', 'health', 'hospital'],
  hospital: ['hospital', 'health', 'doctor'],
  veterinary_care: ['veterinary_care'],
  electrician: ['electrician'],
  plumber: ['plumber'],
  police: ['police'],
  fire_station: ['fire_station'],
  post_office: ['post_office'],
  bank: ['bank', 'atm', 'finance'],
  atm: ['atm', 'bank', 'finance'],
  gas_station: ['gas_station', 'car_repair', 'car_dealer'],
  car_repair: ['car_repair', 'car_dealer', 'gas_station'],
  car_dealer: ['car_dealer', 'car_repair'],
  parking: ['parking'],
  car_wash: ['car_wash'],
  car_rental: ['car_rental', 'travel_agency'],
  travel_agency: ['travel_agency'],
  taxi_stand: ['taxi_stand', 'transit_station'],
  train_station: ['train_station', 'transit_station'],
  subway_station: ['subway_station', 'transit_station', 'bus_station'],
  bus_station: ['bus_station', 'transit_station', 'subway_station'],
  transit_station: ['transit_station', 'train_station', 'subway_station', 'bus_station'],
  airport: ['airport'],
  embassy: ['embassy', 'local_government_office'],
  courthouse: ['courthouse', 'local_government_office'],
  city_hall: ['city_hall', 'local_government_office'],
  local_government_office: ['local_government_office', 'city_hall', 'courthouse'],
  real_estate_agency: ['real_estate_agency'],
  insurance_agency: ['insurance_agency'],
  lawyer: ['lawyer'],
  school: ['school', 'primary_school', 'secondary_school', 'university'],
  primary_school: ['primary_school', 'school'],
  secondary_school: ['secondary_school', 'school'],
  university: ['university', 'school'],
  moving_company: ['moving_company'],
  storage: ['storage'],
  laundry: ['laundry'],
  locksmith: ['locksmith'],
}

const DEFAULT_TYPES = ['tourist_attraction', 'point_of_interest', 'establishment']

// ---------------------------------------------------------------------------
// DynamoDB cache helpers
// ---------------------------------------------------------------------------

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface NearbyCacheEntry {
  pk: string
  sk: string
  data: PlacesNearbyResponse
  expiresAt: number
}

function getCacheKey(lat: number, lng: number, category: string, radius: number): string {
  // Round to ~100m precision for caching
  const roundedLat = Math.round(lat * 1000) / 1000
  const roundedLng = Math.round(lng * 1000) / 1000
  return `places-nearby:${roundedLat},${roundedLng}:${category}:${radius}`
}

async function getCachedNearby(
  lat: number,
  lng: number,
  category: string,
  radius: number,
): Promise<PlacesNearbyResponse | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: getCacheKey(lat, lng, category, radius), sk: 'results' },
    }),
  )

  if (!result.Item) return null
  const entry = result.Item as NearbyCacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.data
}

async function setCachedNearby(
  lat: number,
  lng: number,
  category: string,
  radius: number,
  data: PlacesNearbyResponse,
  ttlSeconds: number = 600, // 10 minutes
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: getCacheKey(lat, lng, category, radius),
        sk: 'results',
        data,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}

// ---------------------------------------------------------------------------
// Google Places API helpers
// ---------------------------------------------------------------------------

const GOOGLE_PLACES_BASE = 'https://places.googleapis.com/v1/places:searchNearby'

function getGoogleApiKey(): string {
  // Use SerpAPI key for now, or add a dedicated Google Places API key to secrets
  return Resource.SerpApiKey.value
}

function mapPriceLevel(level: string | undefined): number | null {
  switch (level) {
    case 'PRICE_LEVEL_FREE':
      return 0
    case 'PRICE_LEVEL_INEXPENSIVE':
      return 1
    case 'PRICE_LEVEL_MODERATE':
      return 2
    case 'PRICE_LEVEL_EXPENSIVE':
      return 3
    default:
      return null
  }
}

function getPhotoUrl(photoName: string | undefined): string {
  if (!photoName) return ''
  // Google Places API v1 photo URL
  // Requires a separate API call or using the place photo API
  // For now, return empty - frontend can fetch if needed
  return ''
}

function mapGoogleTypeToCategory(primaryType: string | undefined, requestedCategory: string): string {
  if (!primaryType) return requestedCategory
  
  // Reverse lookup: find which requested category maps to this Google type
  for (const [cat, types] of Object.entries(CATEGORY_TO_GOOGLE_TYPES)) {
    if (types.includes(primaryType)) {
      return cat
    }
  }
  
  return requestedCategory
}

function toPlaceItem(place: GooglePlacesResult, requestedCategory: string): PlaceItem {
  const category = mapGoogleTypeToCategory(place.primaryType, requestedCategory)
  
  return {
    id: `google-${place.id}`,
    name: place.displayName?.text ?? 'Unknown',
    image: getPhotoUrl(place.photos?.[0]?.name),
    images: place.photos?.map((p) => getPhotoUrl(p.name)) ?? [],
    type: mapCategoryToPlaceType(category),
    rating: place.rating ?? 0,
    tagline: place.editorialSummary?.text ?? place.formattedAddress ?? '',
    category,
    description: place.editorialSummary?.text ?? '',
    tags: place.types?.slice(0, 5) ?? [category],
    latitude: place.location?.latitude ?? 0,
    longitude: place.location?.longitude ?? 0,
    reviewCount: place.userRatingCount,
    address: place.formattedAddress,
    phone: place.nationalPhoneNumber,
    website: place.websiteUri,
    priceLevel: mapPriceLevel(place.priceLevel),
    hours: place.regularOpeningHours?.weekdayDescriptions?.join(', '),
  }
}

function mapCategoryToPlaceType(category: string): PlaceItem['type'] {
  switch (category) {
    case 'restaurant':
    case 'cafe':
      return 'restaurant'
    case 'bar':
    case 'night_club':
    case 'casino':
    case 'nightlife':
      return 'experience'
    case 'movie_theater':
    case 'theater':
    case 'amusement_park':
    case 'zoo':
    case 'aquarium':
    case 'bowling_alley':
      return 'experience'
    case 'hotel':
      return 'attraction' // or add 'hotel' type
    case 'shopping':
    case 'shopping_mall':
      return 'attraction'
    default:
      return 'attraction'
  }
}

async function searchNearbyGooglePlaces(
  lat: number,
  lng: number,
  category: string,
  radius: number = 5000, // 5km default
  maxResults: number = 20,
): Promise<PlacesNearbyResponse> {
  const types = CATEGORY_TO_GOOGLE_TYPES[category] ?? DEFAULT_TYPES
  const apiKey = getGoogleApiKey()
  
  // For now, use SerpAPI google_local with location bias as a fallback
  // since Google Places API (New) requires a separate API key
  // TODO: Add dedicated GOOGLE_PLACES_API_KEY to secrets
  
  const SERPAPI_BASE = 'https://serpapi.com/search.json'
  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_local')
  url.searchParams.set('q', category)
  url.searchParams.set('ll', `@${lat},${lng},14z`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('num', maxResults.toString())
  
  console.log('[places-nearby] searching:', category, 'at', lat, lng, 'radius', radius)

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[places-nearby] SerpAPI error: ${res.status} ${body}`)
      return { places: [], hasMore: false }
    }

    const data = await res.json()
    const results = (data.local_results ?? []) as Array<{
      place_id?: string
      title: string
      thumbnail?: string
      rating?: number
      price?: string
      description?: string
      address?: string
      gps_coordinates?: { latitude: number; longitude: number }
      images?: string[]
    }>
    
    console.log('[places-nearby] got', results.length, 'results for', category)
    
    const places: PlaceItem[] = results.map((place) => ({
      id: `serp-${place.place_id ?? place.title}`,
      name: place.title,
      image: place.images?.[0]?.replace(/w\d+-h\d+/, 'w1024-h1024') ?? place.thumbnail ?? '',
      images: place.images?.map((img) => img.replace(/w\d+-h\d+/, 'w1024-h1024')) ?? [],
      type: mapCategoryToPlaceType(category),
      rating: place.rating ?? 0,
      tagline: place.description ?? '',
      category,
      description: place.description ?? '',
      tags: [category],
      latitude: place.gps_coordinates?.latitude ?? 0,
      longitude: place.gps_coordinates?.longitude ?? 0,
      location: place.address,
    }))

    // Check if there are more results
    const hasMore = results.length >= maxResults || !!data.serpapi_pagination?.next

    return {
      places,
      hasMore,
      nextPageToken: data.serpapi_pagination?.next,
    }
  } catch (err) {
    console.error('[places-nearby] search error:', err)
    return { places: [], hasMore: false }
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const latParam = event.queryStringParameters?.lat
    const lngParam = event.queryStringParameters?.lng
    const categoryParam = event.queryStringParameters?.category ?? 'attraction'
    const radiusParam = event.queryStringParameters?.radius ?? '5000'
    const limitParam = event.queryStringParameters?.limit ?? '20'

    if (!latParam || !lngParam) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'lat and lng parameters are required' }),
      }
    }

    const lat = parseFloat(latParam)
    const lng = parseFloat(lngParam)
    const radius = parseInt(radiusParam, 10)
    const limit = Math.min(parseInt(limitParam, 10), 40)

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid lat, lng, or radius parameter' }),
      }
    }

    // Normalize category to lowercase
    const category = categoryParam.toLowerCase()

    // Validate category
    if (!CATEGORY_TO_GOOGLE_TYPES[category]) {
      console.warn('[places-nearby] unknown category:', category, 'using default')
    }

    console.log('[places-nearby] request:', { lat, lng, category, radius, limit })

    // Check cache first
    const cached = await getCachedNearby(lat, lng, category, radius)
    if (cached) {
      console.log('[places-nearby] cache hit')
      return { statusCode: 200, body: JSON.stringify(cached) }
    }

    // Fetch places
    const response = await searchNearbyGooglePlaces(lat, lng, category, radius, limit)

    // Cache the response (10 min TTL)
    await setCachedNearby(lat, lng, category, radius, response)

    console.log('[places-nearby] returning', response.places.length, 'places, hasMore:', response.hasMore)

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[places-nearby] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
