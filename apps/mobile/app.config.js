// app.config.js — read by Expo CLI / EAS Build at prebuild time.
// Extends the static app.json with values that come from env vars so
// secrets never land in source control. The Android Google Maps key
// gets injected into AndroidManifest.xml as the
// `com.google.android.geo.API_KEY` meta-data tag.
//
// Set `GOOGLE_MAPS_API_KEY_ANDROID` in EAS env vars (preview + production
// environments) with visibility "sensitive" so it stays out of build logs
// and out of the JS bundle.

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
      },
    },
  },
});
