import { View } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapPreviewProps {
  lat: number;
  lng: number;
  label?: string;
  zoom?: number;
  height?: number;
  flex?: boolean;
}

export function MapPreview({
  lat,
  lng,
  label = '',
  zoom = 12,
  height = 160,
  flex = false,
}: MapPreviewProps) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([${lat}, ${lng}]).addTo(map)${label ? `.bindPopup('${label.replace(/'/g, "\\'")}')` : ''};
  </script>
</body>
</html>`;

  return (
    <View style={{
      ...(flex ? { flex: 1 } : { height }),
      borderRadius: flex ? 0 : 12,
      overflow: 'hidden',
      borderWidth: flex ? 0 : 1,
      borderColor: '#e5e7eb',
    }}>
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        javaScriptEnabled
      />
    </View>
  );
}
