// Web stub for react-native-maps — react-native-maps uses native modules
// that can't be bundled for web. The mobile UI guards usage at runtime via
// Platform.OS checks; this shim just satisfies the static import.
const { View } = require('react-native');
module.exports = {
  __esModule: true,
  default: View,
  MapView: View,
  Marker: View,
  Polyline: View,
  Polygon: View,
  Circle: View,
  Callout: View,
  PROVIDER_DEFAULT: undefined,
  PROVIDER_GOOGLE: undefined,
};
