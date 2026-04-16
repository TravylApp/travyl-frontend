# SST Secrets Inventory

All secrets are defined in `infra/secrets.ts`, injected into the web app via `infra/web.ts`, and (where applicable) linked to Lambda functions via `infra/api.ts`.

Values are stored in AWS SSM Parameter Store by SST. Set with:
```bash
AWS_PROFILE=525610233002_AdministratorAccess npx sst secret set <SecretName> <value> --stage production
```

## Actively Used

| SST Secret | Env Var(s) | Where Used | How Accessed |
|---|---|---|---|
| `SupabaseUrl` | `NEXT_PUBLIC_SUPABASE_URL` | Web (public), all API routes, all Lambda functions | `process.env` (web), `Resource.SupabaseUrl.value` (Lambda) |
| `SupabasePublishableKey` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Web (public), `supabase-browser.ts` | `process.env` |
| `SupabaseSecretKey` | `SUPABASE_SECRET_KEY` | `/api/trips/*` routes (create, delete, enrich, list), `/api/stats` | `process.env` (fallback: `SUPABASE_SERVICE_ROLE_KEY`) |
| `SerpApiKey` | `SERPAPI_KEY` | Web: hotels/search, fsq-search, trending-destinations. Lambda: suggest, search, recommend, place-search, activity-intelligence, discover | `process.env` (web), `Resource.SerpApiKey.value` (Lambda) |
| `FoursquareApiKey` | `FOURSQUARE_API_KEY` | Web: `/api/fsq-search` (v3 bearer token) | `process.env` |
| `Pexels` | `PEXELS_API_KEY` | Lambda: `services/lib/pexels.ts` (image search) | `Resource.Pexels.value` |
| `DuffelApiToken` | `DUFFEL_API_TOKEN` | Web: `/api/flights/search` | `process.env` |
| `GeonamesUsername` | `GEONAMES_USERNAME` | Web: `/api/autocomplete` (city search, falls back to `'demo'`) | `process.env` |
| `TimezonedbApiKey` | `TIMEZONEDB_API_KEY` | Web: `/api/timezone` (fallback after timeapi.io) | `process.env` |

## Defined but Not Wired

These secrets are set up in SST and injected as env vars into the web app, but no runtime code currently reads them. They represent planned or unfinished feature work from the `mock-to-real-data-migration.md` roadmap.

| SST Secret | Env Var | Planned Purpose | Why Not Wired |
|---|---|---|---|
| `FoursquareClientId` | `FOURSQUARE_CLIENT_ID` | Foursquare v2 API auth (OAuth) | Superseded by `FoursquareApiKey` (v3 bearer token) used in `/api/fsq-search` |
| `FoursquareClientSecret` | `FOURSQUARE_CLIENT_SECRET` | Foursquare v2 API auth (OAuth) | Same — v3 API uses a single API key instead of client ID/secret |
| `TripadvisorApiKey` | `TRIPADVISOR_API_KEY` | TripAdvisor enrichment for explore items (photos + ratings) | `/api/tripadvisor` proxies to backend (`BACKEND_URL/api/places/nearby`), backend Lambda doesn't link this secret |
| `OpentripmapApiKey` | `OPENTRIPMAP_API_KEY` | Fallback POI data when primary APIs fail | `/api/opentripmap` route was never created. Enrich route calls it (line 108) but gets 404s (silently caught) |
| `UnsplashAccessKey` | `UNSPLASH_ACCESS_KEY` | Hero images for destinations | Images route proxies to backend. Web code uses hardcoded Unsplash photo URLs for fallbacks, not the API |
| `VisualCrossingApiKey` | `VISUAL_CROSSING_API_KEY` | `/api/weather` forecast data | Weather route proxies to backend (`BACKEND_URL/api/weather/forecast`), backend Lambda doesn't link this secret |
| `GraphhopperApiKey` | `GRAPHHOPPER_API_KEY` | `/api/directions` walking/driving routes between places | Directions route was never created |
| `EventbriteApiKey` | `EVENTBRITE_API_KEY` | Real events for destinations | Events route proxies to backend (`BACKEND_URL/api/events/search`), backend Lambda doesn't link this secret |
| `PredicthqApiKey` | `PREDICTHQ_API_KEY` | Supplementary events data | Same — events proxy to backend, backend doesn't link this secret |
| `OpenExchangeRatesAppId` | `OPEN_EXCHANGE_RATES_APP_ID` | Currency exchange for budget tab | `/api/exchange-rates` uses frankfurter.app (free, no key needed) instead |
| `OpenchargeApiKey` | `OPENCHARGE_API_KEY` | EV charging station locations | No route or component exists for this feature at all |

## Not in SST (managed elsewhere)

| Secret | Where Used | How Managed |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Web API routes (fallback for `SUPABASE_SECRET_KEY`) | `.env.local` / Vercel env — not an SST secret |

## Frontend Config (public, not secrets)

These are public env vars set by SST via `infra/web.ts`:

| Env Var | Value Source |
|---|---|
| `NEXT_PUBLIC_RECOMMENDATION_API_URL` | `api.url` (SST API Gateway URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | `supabaseUrl.value` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `supabasePublishableKey.value` |

## Action Items

- **Wire or remove** the 11 "Defined but Not Wired" secrets — either implement the features they were planned for, or clean them up to reduce confusion
- **Migrate `SUPABASE_SERVICE_ROLE_KEY`** into SST as a proper secret rather than relying on `.env.local` / Vercel manual config
- **Verify values are set** for all secrets in production: `npx sst secret list --stage production`
