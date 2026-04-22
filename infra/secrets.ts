// ─── Supabase ────────────────────────────────────────────────
export const supabaseSecretKey = new sst.Secret('SupabaseSecretKey')
export const supabaseUrl = new sst.Secret('SupabaseUrl')
export const supabaseAnonKey = new sst.Secret('SupabaseAnonKey')
export const supabasePublishableKey = new sst.Secret('SupabasePublishableKey')

// ─── Search & Location ──────────────────────────────────────
export const serpApiKey = new sst.Secret('SerpApiKey')
export const foursquareClientId = new sst.Secret('FoursquareClientId')
export const foursquareClientSecret = new sst.Secret('FoursquareClientSecret')
export const foursquareApiKey = new sst.Secret('FoursquareApiKey')
export const tripadvisorApiKey = new sst.Secret('TripadvisorApiKey')
export const geonamesUsername = new sst.Secret('GeonamesUsername')

// ─── Images ─────────────────────────────────────────────────
export const pexels = new sst.Secret('Pexels')

// ─── Travel & Flights ───────────────────────────────────────
export const duffelApiToken = new sst.Secret('DuffelApiToken')

// ─── Weather & Maps ─────────────────────────────────────────
export const visualCrossingApiKey = new sst.Secret('VisualCrossingApiKey')
export const graphhopperApiKey = new sst.Secret('GraphhopperApiKey')
export const timezonedbApiKey = new sst.Secret('TimezonedbApiKey')

// ─── Events ─────────────────────────────────────────────────
export const eventbriteApiKey = new sst.Secret('EventbriteApiKey')
export const predicthqApiKey = new sst.Secret('PredicthqApiKey')
export const ticketmasterApiKey = new sst.Secret('TicketmasterApiKey')

// ─── Misc ───────────────────────────────────────────────────
export const openExchangeRatesAppId = new sst.Secret('OpenExchangeRatesAppId')
export const openchargeApiKey = new sst.Secret('OpenchargeApiKey')

// ─── Booking / Affiliate ────────────────────────────────────
export const openTableAffiliateKey = new sst.Secret('OpenTableAffiliateKey')
