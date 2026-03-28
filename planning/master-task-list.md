# Travyl Master Task List — 6 Week Sprint

Last updated: March 28, 2026

---

## CRITICAL — App-Breaking

| # | Task | Source | Status |
|---|---|---|---|
| C1 | Fix CloudFront 403 on trip creation (payload too large for WAF) | E2E test | Done (TRA-288, TRA-358) |
| C2 | Fix Amplify build stability (main/develop divergence) | Recurring | Done (TRA-286) |
| C3 | Fix location filtering — wrong city results (Universal Studios in New Delhi) | Demo feedback F1 | Todo |
| C4 | Fix deployed site: missing env vars, API routes 404/500 | E2E test | Done (TRA-290, TRA-357) |

## HIGH — Broken or Fake Features

| # | Task | Source | Status |
|---|---|---|---|
| H1 | Questions: multi-select + skip button | Demo feedback F2 | Done (TRA-287) |
| H2 | Card clicks → expand in-place detail (not blurry modal) | User feedback | Todo |
| H3 | "Add to trip" buttons are fake — toggle local state only | E2E test | Todo |
| H4 | Hotels page ignores trip_context (shows 0 until SerpAPI loads) | E2E test | Todo |
| H5 | Flight search tabs don't filter (cheap/quick/best) | Audit + demo feedback | Todo |
| H6 | Restaurants tab redirects silently to Explore | Audit | Todo |
| H7 | Favorites not persisted — wire /api/favorites | Audit | Todo |
| H8 | Budget expenses not persisted — lost on refresh | Audit | Todo |
| H9 | Budget categories all show $0 despite having data | E2E test | Todo |
| H10 | Day selector doesn't switch content on itinerary | E2E test | Todo |
| H11 | Images low res and not clickable | Demo feedback F3 | Todo |
| H12 | Settings page stuck "Loading..." for anonymous users | E2E test | Todo |
| H13 | Packing list empty for new trips — needs auto-generation | E2E test | Todo |
| H14 | Profile page all mock data (web + mobile) | Audit | Todo |
| H15 | Mobile hotels 100% mock — doesn't read trip_context | Audit | Todo |
| H16 | Mobile flight search doesn't submit | Audit | Todo |
| H17 | Apple/Facebook/Microsoft OAuth buttons empty on mobile | Audit | Todo |
| H18 | Mobile places not loading (API routing) | Testing | Partial |

## MEDIUM — Polish & UX

| # | Task | Source | Status |
|---|---|---|---|
| M1 | How It Works scroll snapping | User feedback | Done (TRA-287) |
| M2 | Font color contrast issues on some text | Demo feedback F4 | Partial (TRA-287, hero done) |
| M3 | Add accommodation types ("stay with someone", "own house") | Demo feedback F5 | Todo |
| M4 | Trip visibility enforcement — anon users see others' trips | Demo feedback F6 | Partial (TRA-357 — RLS policies + auth session leak fixed) |
| M5 | Currency conversion — wire /api/exchange-rates | Demo feedback F7 | Todo |
| M6 | Map language consistent with user locale | Demo feedback F8 | Todo |
| M7 | Fix events API params (city+country, not lat/lng) | E2E test | Todo |
| M8 | Fix flight search params (city names, not IATA codes) | API test | Todo |
| M9 | Giant hero background bleeds through overview | Visual test | Todo |
| M10 | Explore cards with no images → dark navy boxes | Visual test | Todo |
| M11 | "Add activity" flow ambiguous on itinerary | Audit | Todo |
| M12 | Hotel phone/email always empty | Audit | Todo |
| M13 | NLP search everywhere — universal search component | Demo feedback F10 | Todo |
| M14 | Mobile budget daily chart hardcoded | Audit | Todo |
| M15 | Mobile settings hardcoded "Alex Rivera" | Audit | Todo |
| M16 | Drag day to swap itinerary plans | User feedback | Todo |
| M17 | Suppress hero_config/mosaic_tiles/inspiration_cards 404s | E2E test | Done (TRA-287, TRA-359) |

## LOW — Nice to Have

| # | Task | Source | Status |
|---|---|---|---|
| L1 | Home page images always same destinations | User feedback | Done (TRA-287, trending API) |
| L2 | Travel advisories for unsafe locations | Demo feedback F9 | Todo |
| L3 | Onboarding — "a lot to look through at first" | Demo feedback F11 | Todo |
| L4 | Photo content moderation/filtering | Demo feedback F12 | Todo |
| L5 | Cars tab — implement or remove | Audit | Todo |
| L6 | Profile settings pickers empty (email, password, delete) | Audit | Todo |
| L7 | Forgot password not implemented | Audit | Todo |
| L8 | Parallax workaround (document scroll) | Audit | Done (TRA-285) |

## ENRICHMENT — SerpAPI Powered (Weeks 3-4)

| # | Task | Source | Status |
|---|---|---|---|
| E1 | Wire /api/favorites for persistence (backend has it) | API audit | Todo |
| E2 | Wire /api/hotels/search to mobile hotels | API audit | Todo |
| E3 | Wire /api/weather/forecast to overview + itinerary | API audit | Todo |
| E4 | Wire /api/places/enrich to PlaceDetailModal | API audit | Todo |
| E5 | Wire /api/places/menu for restaurant menus | API audit | Todo |
| E6 | Request: /api/places/reviews (Google Maps Reviews) | SerpAPI map | Todo |
| E7 | Request: /api/search/autocomplete (type-ahead) | SerpAPI map | Done (TRA-360 — Geonames autocomplete on hero search) |
| E8 | Request: /api/tripadvisor/place (rankings, badges) | SerpAPI map | Todo |
| E9 | Request: /api/yelp/place (food photos, "Good for" tags) | SerpAPI map | Todo |
| E10 | Request: /api/destinations/trending (Google Trends) | SerpAPI map | Todo |
| E11 | Request: /api/destinations/news (Google News) | SerpAPI map | Todo |
| E12 | Request: /api/opentable/search (reservations) | SerpAPI map | Todo |
| E13 | Use /api/images/destination for trip hero images | API audit | Todo |
| E14 | Cross-source card enrichment (Google + TA + Yelp merged) | Strategy | Todo |

## NEW FEATURES (Weeks 4-6)

| # | Task | Source | Status |
|---|---|---|---|
| N1 | Reviews system — submit + display | Roadmap | Todo |
| N2 | Booking/payment integration (Stripe) | Roadmap | Todo |
| N3 | Push notifications | Roadmap | Todo |
| N4 | Offline mode for mobile | Roadmap | Todo |
| N5 | Deep linking — share trips via URL | Roadmap | Todo |
| N6 | Trip templates — browse + apply | Roadmap | Todo |
| N7 | Email notifications — trip reminders, flight alerts | Roadmap | Todo |
| N8 | Accessibility audit (WCAG 2.1 AA) | Roadmap | Todo |
| N9 | Analytics integration | Roadmap | Todo |
| N10 | App store submission prep | Roadmap | Todo |

## SECURITY — Hardening (Done March 27)

| # | Task | Status |
|---|---|---|
| S1 | Remove service role key from ALL API routes (use anon key + RLS) | Done (TRA-357) |
| S2 | Auth session leak — shared Supabase singleton persisted across users on SSR | Done (TRA-357) |
| S3 | Delete route had no auth — anyone could delete any trip | Done (TRA-357) |
| S4 | Origin checks on all POST routes (create, update, delete, enrich, plan, extract) | Done (TRA-357) |
| S5 | Rate limiting on expensive routes (flights, hotels, trending, plan, extract, enrich, create, delete) | Done (TRA-357) |
| S6 | Input validation on trip create (destination, travelers, budget, currency) | Done (TRA-357) |
| S7 | Prompt length validation on extract/plan (max 2000 chars) | Done (TRA-357) |
| S8 | RLS policies — anon insert/select public trips, time-limited update (1hr) | Done (TRA-357) |
| S9 | Enrich route — 15s timeout on 22 parallel fetches via AbortController | Done (TRA-357) |
| S10 | Drop overly permissive anon UPDATE policy (replaced with time-limited) | Done (TRA-357) |

---

## COMPLETED

| # | Task | PR |
|---|---|---|
| ✓ | Mock data removal (web + mobile) | TRA-285, #356 |
| ✓ | Mobile trip gen fix (useTripPlanner routing) | TRA-285, #356 |
| ✓ | Flight data wiring (trip_context fallback) | TRA-285, #356 |
| ✓ | Calendar navbar/sidebar transparency | TRA-285, #356 |
| ✓ | useScroll hydration fix | TRA-285, #356 |
| ✓ | Repo cleanup — screenshots, orphaned components | TRA-286, #382 |
| ✓ | Amplify build fixes (styled-jsx, layoutEffect, props) | Multiple PRs |
| ✓ | SUPABASE_SERVICE_ROLE_KEY env var compat | #358 |
| ✓ | Mobile flights wired to trip_context | #363 |
| ✓ | Homepage polish — live stats, trending pills, hero contrast, cleanup | TRA-287, #386 |
| ✓ | CloudFront WAF fix — bypass for anon, trimmed for auth | TRA-288, TRA-358 |
| ✓ | Deployed site env vars — switched to anon key, no service key needed | TRA-290 |
| ✓ | Security hardening — 10 fixes (see Security section above) | TRA-357 |
| ✓ | Auth session leak — persistSession: false on shared client | TRA-357 |
| ✓ | Suppress 404s — hero_config, mosaic_tiles, inspiration_cards, itinerary_days | TRA-359 |
| ✓ | Destination autocomplete dropdown on hero search | TRA-360 |
| ✓ | Auto-skip stuck fix — fallback to showing questions after 2 retries | TRA-361 |
| ✓ | Default start_date/end_date when backend returns null | TRA-358 |
