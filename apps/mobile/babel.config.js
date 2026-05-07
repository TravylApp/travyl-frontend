// Force-load babel-preset-expo's expo-router-plugin so it inlines
// process.env.EXPO_ROUTER_APP_ROOT (and related) into _ctx.{ios,web}.js.
// The preset's auto-detection (hasModule('expo-router')) silently returns
// false in this monorepo because babel-preset-expo is hoisted to the root
// while expo-router lives in apps/mobile/node_modules. Without this plugin
// the bundle fails with: "Invalid call at line 2: process.env.EXPO_ROUTER_APP_ROOT".
// Importing it here resolves from apps/mobile, where Node's walk-up can
// find expo-router for the plugin's caller-based routerRoot lookup.
// Idempotent: running the substitution twice is a no-op since the env var
// is replaced with a string literal on the first pass.
const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      expoRouterBabelPlugin,
      'react-native-reanimated/plugin',
    ],
  };
};
