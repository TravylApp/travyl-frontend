const { withNativeWind } = require('nativewind/metro');
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages from
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force a single copy of React + react-native — root has React 19.2 (web tree)
// while apps/mobile pins 19.1 for Expo 54. Two copies => "useMemo of null".
// Anchor resolution at apps/mobile so its node_modules wins for these.
const singletonAnchor = path.join(projectRoot, '__metro_anchor__.js');
const SINGLETONS = new Set(['react', 'react-dom', 'react-native']);

// On web, swap react-native-maps for a stub — its native modules can't be
// bundled for web. Native targets resolve normally.
const mapsShim = path.resolve(projectRoot, 'maps-shim.web.js');
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { filePath: mapsShim, type: 'sourceFile' };
  }
  const head = moduleName.split('/')[0];
  if (SINGLETONS.has(head)) {
    return context.resolveRequest(
      { ...context, originModulePath: singletonAnchor },
      moduleName,
      platform
    );
  }
  if (baseResolveRequest) return baseResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
