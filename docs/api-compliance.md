# API Compliance & Usage Guidelines

## How We Handle API Keys

All API keys are stored server-side in `.env.local` and accessed only through Next.js API routes (`/api/*`). Keys are **never** exposed to the client browser. This is the recommended pattern for all providers.

---

## Per-API Compliance

### Duffel (Flights)
- **Tier:** Test mode (`duffel_test_` prefix)
- **Limits:** Unlimited test calls, limited airline access
- **Rules:**
  - Test mode returns simulated pricing — do NOT display as "real prices" to end users
  - To go live: switch to `duffel_live_` key, requires Duffel approval
  - Must display Duffel attribution if showing their data publicly
  - Booking requires payment integration through Duffel's payment flow
- **Our usage:** Search only (no booking), test mode clearly indicated
- **Docs:** https://duffel.com/docs

### Visual Crossing (Weather)
- **Tier:** Free (1000 calls/day)
- **Rules:**
  - Attribution required: "Powered by Visual Crossing"
  - Data can be cached (we cache 1 hour via `next.revalidate`)
  - No redistribution of raw data
- **Our usage:** Weather display on trip overview, cached per destination
- **Docs:** https://www.visualcrossing.com/resources/documentation/weather-api/

### Foursquare (Hotels, Restaurants, Attractions)
- **Tier:** Free (v2 with Client ID + Secret)
- **Limits:** 500 premium calls/day, 99,500 regular calls/day
- **Rules:**
  - Attribution required: "Powered by Foursquare"
  - Cannot store venue data longer than 30 days (we cache 1 hour)
  - Must link back to Foursquare venue pages when possible
- **Our usage:** Hotel search, restaurant recommendations on trip overview
- **Docs:** https://docs.foursquare.com/

### GraphHopper (Directions)
- **Tier:** Free (500 requests/day)
- **Rules:**
  - Must display: "Powered by GraphHopper" or link to graphhopper.com
  - Must use OpenStreetMap attribution: "© OpenStreetMap contributors"
  - Route data cannot be cached longer than 24 hours
- **Our usage:** Walking/driving directions between places
- **Docs:** https://docs.graphhopper.com/

### Google News RSS (News)
- **Tier:** Free (no key, RSS feed)
- **Rules:**
  - For personal, non-commercial feed reading only
  - Must link to original article source
  - Cannot republish full articles
- **Our usage:** Headlines + links on trip overview, always links to source
- **Docs:** Standard RSS usage

### Aviationstack (Flight Tracking)
- **Tier:** Free (500 calls/month)
- **Rules:**
  - Attribution: "Powered by aviationstack"
  - Free tier: HTTP only (no HTTPS) — we proxy through our API route
  - Cannot redistribute raw data
- **Our usage:** Not actively used yet, reserved for live flight tracking

### RestCountries (Country Info)
- **Tier:** Free, unlimited, no key
- **Rules:** Open source, no restrictions. Attribution appreciated.
- **Docs:** https://restcountries.com/

### Nager.Date (Public Holidays)
- **Tier:** Free, unlimited, no key
- **Rules:** Open source, no restrictions
- **Docs:** https://date.nager.at/

### Wikipedia (Destination Info)
- **Tier:** Free, unlimited, no key
- **Rules:**
  - Must attribute: "From Wikipedia" with link to article
  - Content is CC BY-SA licensed
  - Respect rate limits (200 req/s, we're way under)
- **Docs:** https://en.wikipedia.org/api/rest_v1/

### Nominatim / OpenStreetMap (Geocoding)
- **Tier:** Free, 1 req/sec
- **Rules:**
  - Must display: "© OpenStreetMap contributors"
  - Respect 1 request/second limit
  - Set User-Agent header with app name
- **Our usage:** Geocoding city names to lat/lng for place search

### Unsplash (Images)
- **Tier:** Free demo (50 req/hour) or Production (approved)
- **Rules:**
  - Must credit photographer: "Photo by [Name] on Unsplash"
  - Cannot use as image hosting (hotlinking OK for display)
  - Link back to photographer's profile
- **Our usage:** Hero images when Unsplash key is set, falls back to Google Places photos

### Python Backend / SerpAPI (Places)
- **Tier:** Teammate's deployment on EC2
- **Rules:** SerpAPI terms apply (teammate manages key)
- **Our usage:** Proxied through /api/places route

---

## Attribution Checklist

For production deployment, add these attributions to the footer or a credits page:

- [ ] "Weather data by Visual Crossing"
- [ ] "Places by Foursquare"
- [ ] "Routing by GraphHopper"
- [ ] "Maps © OpenStreetMap contributors"
- [ ] "Destination info from Wikipedia (CC BY-SA)"
- [ ] "Flight data by Duffel" (when in live mode)
- [ ] "Country data by RestCountries"
- [ ] Photo credits for Unsplash images

---

## Rate Limiting Strategy

All API routes use Next.js `{ next: { revalidate: 3600 } }` to cache responses for 1 hour. This means:
- Same destination weather won't be fetched twice in an hour
- Hotel/restaurant results are cached per location
- Country info is cached (rarely changes)
- News is refreshed hourly

This keeps us well within free tier limits for all providers.
