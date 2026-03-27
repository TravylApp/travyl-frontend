import { api } from './api'
import {
  supabaseUrl,
  supabasePublishableKey,
  supabaseSecretKey,
  serpApiKey,
  pexels,
  unsplashAccessKey,
  foursquareClientId,
  foursquareClientSecret,
  foursquareApiKey,
  tripadvisorApiKey,
  geonamesUsername,
  opentripmapApiKey,
  duffelApiToken,
  visualCrossingApiKey,
  graphhopperApiKey,
  timezonedbApiKey,
  eventbriteApiKey,
  predicthqApiKey,
  openExchangeRatesAppId,
  openchargeApiKey,
} from './secrets'

export const site = new sst.aws.Nextjs('TravylWeb', {
  path: 'apps/web',
  environment: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.value,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey.value,
    NEXT_PUBLIC_RECOMMENDATION_API_URL: api.url,
    PEXELS_API_KEY: pexels.value,
  },
})

export const web = new sst.x.DevCommand('TravylWebDev', {
  dev: {
    command: 'npm run web',
    directory: 'apps/web',
    autostart: true,
  },
  environment: {
    // Public (browser-safe)
    NEXT_PUBLIC_RECOMMENDATION_API_URL: api.url,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.value,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey.value,

    // Server-only — Supabase
    SUPABASE_SECRET_KEY: supabaseSecretKey.value,

    // Server-only — Search & Location
    SERPAPI_KEY: serpApiKey.value,
    FOURSQUARE_CLIENT_ID: foursquareClientId.value,
    FOURSQUARE_CLIENT_SECRET: foursquareClientSecret.value,
    FOURSQUARE_API_KEY: foursquareApiKey.value,
    TRIPADVISOR_API_KEY: tripadvisorApiKey.value,
    GEONAMES_USERNAME: geonamesUsername.value,
    OPENTRIPMAP_API_KEY: opentripmapApiKey.value,

    // Server-only — Images
    PEXELS_API_KEY: pexels.value,
    UNSPLASH_ACCESS_KEY: unsplashAccessKey.value,

    // Server-only — Travel
    DUFFEL_API_TOKEN: duffelApiToken.value,

    // Server-only — Weather & Maps
    VISUAL_CROSSING_API_KEY: visualCrossingApiKey.value,
    GRAPHHOPPER_API_KEY: graphhopperApiKey.value,
    TIMEZONEDB_API_KEY: timezonedbApiKey.value,

    // Server-only — Events
    EVENTBRITE_API_KEY: eventbriteApiKey.value,
    PREDICTHQ_API_KEY: predicthqApiKey.value,

    // Server-only — Misc
    OPEN_EXCHANGE_RATES_APP_ID: openExchangeRatesAppId.value,
    OPENCHARGE_API_KEY: openchargeApiKey.value,
  },
})
