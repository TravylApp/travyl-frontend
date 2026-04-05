# Travyl Master Task List — 6 Week Sprint

Last updated: April 4, 2026

---

## CRITICAL — App-Breaking

| # | Task | Source | Status |
|---|---|---|---|
| C1 | Fix CloudFront 403 on trip creation (payload too large for WAF) | E2E test | ✅ Done (trimmed payloads ~3KB) |
| C2 (TRA-286) | Fix Amplify build stability (main/develop divergence) | Recurring | ✅ Done |
| C3 (TRA-384) | Fix location filtering — wrong city results (Universal Studios in New Delhi) | Demo feedback F1 | ✅ Done (25km Haversine filter + obscure location fallback) |
| C4 | Fix deployed site: missing env vars, API routes 404/500 | E2E test | ✅ Done (switched to anon key, no service key needed) |

## HIGH — Broken or Fake Features

| # | Task | Source | Status |
|---|---|---|---|
| H1 (TRA-287) | Questions: multi-select + skip button | Demo feedback F2 | ✅ Done |
| H2 (TRA-374) | Card clicks → expand in-place detail (not blurry modal) | User feedback | ✅ Done (PlaceDetailOverlay with flip card) |
| H3 | "Add to trip" buttons are fake — toggle local state only | E2E test | ✅ Done |
| H4 (TRA-362) | Hotels page ignores trip_context (shows 0 until SerpAPI loads) | E2E test | ✅ Done |
| H5 (TRA-362) | Flight search tabs don't filter (cheap/quick/best) | Audit + demo feedback | ✅ Done |
| H6 | Restaurants tab redirects silently to Explore | Audit | ✅ Done (redirects to Activities?tab=restaurant) |
| H7 (TRA-296/TRA-328) | Favorites not persisted — wire /api/favorites | Audit | ✅ Done (useServerFavorites hook — server sync for auth, localStorage for anon) |
| H8 | Budget expenses not persisted — lost on refresh | Audit | Todo (RLS policies added, needs testing) |
| H9 (TRA-362) | Budget categories all show $0 despite having data | E2E test | ✅ Done |
| H10 (TRA-362) | Day selector doesn't switch content on itinerary | E2E test | ✅ Done |
| H11 (TRA-405/TRA-410) | Images low res and not clickable | Demo feedback F3 | ✅ Done (removed referrerPolicy, 1200x800 upscale, hi-res pipeline) |
| H12 (TRA-362) | Settings page stuck "Loading..." for anonymous users | E2E test | ✅ Done |
| H13 (TRA-362/TRA-376) | Packing list empty for new trips — needs auto-generation | E2E test | ✅ Done (local suggestions + anonymous inserts) |
| H14 | Profile page all mock data (web + mobile) | Audit | ✅ Done (removed Alex Rivera, test cards, empty form fields) |
| H15 (TRA-391) | Mobile hotels 100% mock — doesn't read trip_context | Audit | ✅ Done (reads from trip_context, no mock fallback) |
| H16 | Mobile flight search doesn't submit | Audit | ✅ Done (useFlightSearch hook wired to search button) |
| H17 | Apple/Facebook/Microsoft OAuth buttons empty on mobile | Audit | Todo |
| H18 (TRA-307) | Mobile places not loading (API routing) | Testing | ✅ Done (removed hardcoded cities, suggest-based browse, shared hooks) |

## MEDIUM — Polish & UX

| # | Task | Source | Status |
|---|---|---|---|
| M1 (TRA-364) | How It Works scroll snapping | User feedback | ✅ Done (removed scroll hijacking, reduced to 135vh) |
| M2 | Font color contrast issues on some text | Demo feedback F4 | ✅ Done (hero pills, questions panel contrast increased) |
| M3 (TRA-308) | Add accommodation types ("stay with someone", "own house") | Demo feedback F5 | Todo (needs backend change) |
| M4 | Trip visibility enforcement — anon users see others' trips | Demo feedback F6 | ✅ Done (RLS policies, anon CRUD on public trips) |
| M5 | Currency conversion — wire /api/exchange-rates | Demo feedback F7 | ✅ Done (interactive converter in hero) |
| M6 (TRA-311) | Map language consistent with user locale | Demo feedback F8 | ✅ Done (CARTO Voyager with getUserLang) |
| M7 | Fix events API params (city+country, not lat/lng) | E2E test | ✅ Done |
| M8 | Fix flight search params (city names, not IATA codes) | API test | ✅ Done (proxy route forwards to backend, removed CITY_AIRPORTS, wired SerpAPI) |
| M9 (TRA-314) | Giant hero background bleeds through overview | Visual test | ✅ Done (overflow-hidden on parent container) |
| M10 | Explore cards with no images → dark navy boxes | Visual test | ✅ Done (filter empty images, fallback icon) |
| M11 (TRA-370) | "Add activity" flow ambiguous on itinerary | Audit | ✅ Done (Regenerate dropdown with suggest/fill/nearby) |
| M12 | Hotel phone/email always empty | Audit | ✅ Done |
| M13 | NLP search everywhere — universal search component | Demo feedback F10 | ✅ Done (Spotlight search uses /api/search/quick + deep, places page uses NLP via /api/places?q=) |
| M14 | Mobile budget daily chart hardcoded | Audit | ✅ Done |
| M15 | Mobile settings hardcoded "Alex Rivera" | Audit | ✅ Done (removed all mock profile/cards data) |
| M16 (TRA-321) | Drag day to swap itinerary plans | User feedback | Todo |
| M17 (TRA-287) | Suppress hero_config/mosaic_tiles/inspiration_cards 404s | E2E test | ✅ Done (mosaic removed) |

## LOW — Nice to Have

| # | Task | Source | Status |
|---|---|---|---|
| L1 (TRA-287/TRA-364) | Home page images always same destinations | User feedback | ✅ Done (trending + random offsets) |
| L2 | Travel advisories for unsafe locations | Demo feedback F9 | ✅ Done (safety badge in TripMagazineHero) |
| L3 | Onboarding — "a lot to look through at first" | Demo feedback F11 | Todo |
| L4 | Photo content moderation/filtering | Demo feedback F12 | Todo |
| L5 | Cars tab — implement or remove | Audit | ✅ Done |
| L6 | Profile settings pickers empty (email, password, delete) | Audit | Todo |
| L7 | Forgot password not implemented | Audit | ✅ Done |
| L8 (TRA-285/TRA-364) | Parallax workaround (document scroll) | Audit | ✅ Done (scoped to hero) |

## ENRICHMENT — SerpAPI Powered (Weeks 3-4)

| # | Task | Source | Status |
|---|---|---|---|
| E1 (TRA-328) | Wire /api/favorites for persistence (backend has it) | API audit | ✅ Done (useServerFavorites hook + web proxy routes) |
| E2 | Wire /api/hotels/search to mobile hotels | API audit | ✅ Done (useHotelSearch hook, merges with trip_context hotels) |
| E3 (TRA-330) | Wire /api/weather/forecast to overview + itinerary | API audit | ✅ Done (useWeather hook on places page + trip overview) |
| E4 (TRA-374/TRA-402) | Wire /api/places/enrich to PlaceDetailModal | API audit | ✅ Done (usePlaceDetail + usePlaceEnrich hooks on web + mobile) |
| E5 (TRA-332) | Wire /api/places/menu for restaurant menus | API audit | ✅ Done (usePlaceMenu hook on web + mobile card detail) |
| E6 (TRA-333) | Request: /api/places/reviews (Google Maps Reviews) | SerpAPI map | ✅ Done |
| E7 (TRA-360) | Request: /api/search/autocomplete (type-ahead) | SerpAPI map | ✅ Done (destination autocomplete) |
| E8 (TRA-335) | Request: /api/tripadvisor/place (rankings, badges) | SerpAPI map | Todo |
| E9 (TRA-336) | Request: /api/yelp/place (food photos, "Good for" tags) | SerpAPI map | Todo |
| E10 (TRA-337) | Request: /api/destinations/trending (Google Trends) | SerpAPI map | Todo |
| E11 (TRA-338) | Request: /api/destinations/news (Google News) | SerpAPI map | Todo |
| E12 (TRA-339) | Request: /api/opentable/search (reservations) | SerpAPI map | Todo |
| E13 (TRA-340) | Use /api/images/destination for trip hero images | API audit | ✅ Done (useDestinationImage hook on places page + trip overview) |
| E14 (TRA-341) | Cross-source card enrichment (Google + TA + Yelp merged) | Strategy | ✅ Done (usePlaceEnrich wired to PlaceDetailModal on trip pages) |

## NEW FEATURES (Weeks 4-6)

| # | Task | Source | Status |
|---|---|---|---|
| N1 | Reviews system — submit + display | Roadmap | Todo |
| N2 | Booking/payment integration (Stripe) | Roadmap | Todo |
| N3 | Push notifications | Roadmap | Todo |
| N4 | Offline mode for mobile | Roadmap | Todo |
| N5 (TRA-346) | Deep linking — share trips via URL | Roadmap | ✅ Done (share page exists, added OG meta tags for social previews) |
| N6 | Trip templates — browse + apply | Roadmap | Todo |
| N7 | Email notifications — trip reminders, flight alerts | Roadmap | Todo |
| N8 | Accessibility audit (WCAG 2.1 AA) | Roadmap | Todo |
| N9 | Analytics integration | Roadmap | Todo |
| N10 | App store submission prep | Roadmap | Todo |

## SECURITY — Hardening

| # | Task | Status |
|---|---|---|
| S1 | Remove service role key from ALL API routes (use anon key + RLS) | ✅ Done |
| S2 | Auth session leak — shared Supabase singleton persisted across users on SSR | ✅ Done |
| S3 | Delete route had no auth — anyone could delete any trip | ✅ Done (owner check added) |
| S4 | Origin checks on all POST routes | ✅ Done |
| S5 | Rate limiting on expensive routes | ✅ Done (in-memory; Redis upgrade TRA-381) |
| S6 | Input validation on trip create | ✅ Done |
| S7 | Prompt length validation on extract/plan (max 2000 chars) | ✅ Done |
| S8 | RLS policies — anon CRUD on public trips, packing, budget, activities | ✅ Done |
| S9 | Enrich route — 15s timeout on parallel fetches | ✅ Done |
| S10 | /api/trips/update ownership check + rate limiting | ✅ Done (Mar 30) |
| S11 | /api/trips/enrich ownership check | ✅ Done (Mar 30) |
| S12 | /api/entity-search query param allowlist | ✅ Done (Mar 30) |
| S13 | /api/trips/plan + extract body field allowlisting | ✅ Done (Mar 30) |
| S14 | Service role key moved from .env to .env.local only | ✅ Done (Mar 30) |
| S15 (TRA-380) | Route calendar AI calls through API proxy (not direct Lambda) | Todo |
| S16 (TRA-381) | Replace in-memory rate limiter with Redis | Todo |
| S17 (TRA-382) | CSRF tokens for sensitive routes | Todo |
| S18 (TRA-383) | Audit delete_trip_cascade RPC permissions | Todo |

## ADDITIONS FROM MAR 29-30 SESSION

| # | Task | Status |
|---|---|---|
| A1 (TRA-363) | Navbar GPU-friendly animation (shell/bar split) | ✅ Done |
| A2 (TRA-364) | Homepage scroll performance (scoped parallax, HowItWorks fix) | ✅ Done |
| A3 (TRA-365) | Trip generation day cap + default dates + short prompts | ✅ Done |
| A4 (TRA-366) | Inline trip editing from hero (dates, travelers, title) | ✅ Done |
| A5 (TRA-368) | Calendar fullscreen with hover-reveal sidebar | ✅ Done |
| A6 (TRA-369) | Calendar ↔ Itinerary sync (activity table seeding) | ✅ Done |
| A7 (TRA-370) | Itinerary regeneration system (entire trip, day, suggest, nearby) | ✅ Done |
| A8 (TRA-371) | At a Glance rounded corners + side-by-side image | ✅ Done |
| A9 (TRA-373) | Places page Near You grid (no gaps) | ✅ Done |
| A10 (TRA-375/TRA-376) | Packing list anonymous fix + personal/shared concept | ✅ Done |
| A11 (TRA-379) | Tab transition animations (slide + fade) | ✅ Done |
| A12 (TRA-379) | Explore section variety (destination-based queries, shuffle) | ✅ Done |
| A13 (TRA-378) | PlaceDetailOverlay minimal mode + exit animations | ✅ Done |
| A14 | Trips page spacing fix (navbar clearance) | ✅ Done |
| A15 | Places page filter bar spacing fix | ✅ Done |

---

## SCORE

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Critical | 4 | 4 | 0 |
| High | 18 | 18 | 0 |
| Medium | 17 | 16 | 1 (M3 needs backend) |
| Low | 8 | 6 | 2 |
| Enrichment | 14 | 10 | 4 |
| New Features | 10 | 1 | 9 |
| Security | 18 | 14 | 4 |
| Session Additions | 15 | 15 | 0 |
| Apr 3 Deploy | 12 | 12 | 0 |
| Apr 4 Data Integrity | 15 | 14 | 1 (backend) |
| **TOTAL** | **131** | **110** | **21** |

### April 3 Deploy Fixes (not in original 104)
| Task | TRA | Status |
|------|-----|--------|
| Remove referrerPolicy from all images | TRA-405 | ✅ Done |
| Simplify Explore section (3 categories) | TRA-406 | ✅ Done |
| Pexels API key not reaching Amplify SSR | TRA-407 | ✅ Done |
| Enrichment baseUrl localhost:3000 bug | TRA-408 | ✅ Done |
| Calendar auto-seed DB constraints | TRA-409 | ✅ Done |
| Hi-res images across pipeline | TRA-410 | ✅ Done |
| Remove travel quote from hero | TRA-411 | ✅ Done |
| Photo mosaic on itinerary page | TRA-412 | ✅ Done |
| Amplify env var injection (amplify.yml) | — | ✅ Done |
| Ambiguous location disambiguation | TRA-353 | ✅ Done |
| Mobile itinerary drag persistence | TRA-388 | ✅ Done |
| Packing personal vs shared | TRA-375 | ✅ Done |

## APRIL 4 SESSION — Data Integrity + API Wiring

| # | Task | TRA | Status |
|---|------|-----|--------|
| D1 | Remove hardcoded CATEGORIES from Explore tab — NLP queries | TRA-424 | ✅ Done |
| D2 | Remove hardcoded CITY_AIRPORTS from flights + itinerary (web + mobile) | TRA-421 | ✅ Done |
| D3 | Remove hardcoded € currency — dynamic via useHomeCurrency + Intl | TRA-421 | ✅ Done |
| D4 | Wire SerpAPI flights — 21 real flights with live prices | TRA-422 | ✅ Done |
| D5 | Wire SerpAPI hotels — source badges (Google Hotels / Foursquare) | TRA-422 | ✅ Done |
| D6 | Remove ALL fabricated hotel data (fake prices, ratings, taxes, policies) | TRA-423 | ✅ Done |
| D7 | Remove fabricated flight data (fake amenities, on-time %, CO2) | TRA-423 | ✅ Done |
| D8 | Remove mobile mock hotels (Hôtel Le Marais, ~150 lines) | TRA-423 | ✅ Done |
| D9 | Remove mockActivityCoords — real coords or no marker | TRA-423 | ✅ Done |
| D10 | Replace cuisine section with live "Must-Try Restaurants" | TRA-424 | ✅ Done |
| D11 | Image fallback chain (PinCard + overview) — no broken images | TRA-424 | ✅ Done |
| D12 | Airport search input fix — can type/delete/select | TRA-424 | ✅ Done |
| D13 | Budget currency extraction from old "EUR (€)" format | TRA-421 | ✅ Done |
| D14 | Places API — pass lat/lng to NLP search, fallback to nearby | TRA-424 | ✅ Done |
| D15 | Backend audit: category mapping + broken search (ticket created) | TRA-420 | 🔲 Backend needed |
