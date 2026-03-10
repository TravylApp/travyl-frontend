import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  color: string;
  number?: number;
  /** Muted style: smaller, gray border, no number — used for explore suggestions */
  muted?: boolean;
}

export interface MapPreviewHandle {
  /** Pan to a marker by index and open its popup */
  focusMarker: (index: number) => void;
  /** Reset view to fit all markers */
  resetView: () => void;
}

interface MapPreviewProps {
  lat: number;
  lng: number;
  label?: string;
  zoom?: number;
  height?: number;
  flex?: boolean;
  markers?: MapMarker[];
  interactive?: boolean;
  borderless?: boolean;
  routeColor?: string;
}

export const MapPreview = forwardRef<MapPreviewHandle, MapPreviewProps>(function MapPreview({
  lat,
  lng,
  label = '',
  zoom = 12,
  height = 160,
  flex = false,
  markers,
  interactive,
  borderless = false,
  routeColor = '#6366f1',
}, ref) {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    focusMarker(index: number) {
      webViewRef.current?.injectJavaScript(
        `if(window._markers&&window._markers[${index}]){var m=window._markers[${index}];map.flyTo(m.getLatLng(),15,{duration:0.5});m.openPopup();}true;`
      );
    },
    resetView() {
      webViewRef.current?.injectJavaScript(
        `if(window._bounds){map.flyToBounds(window._bounds,{padding:[40,40],duration:0.5});}true;`
      );
    },
  }));

  // Default: interactive when there are multiple markers
  const isInteractive = interactive ?? (markers != null && markers.length > 0);
  const markersJs = markers?.length
    ? `window._markers=[];` + markers.map((m, i) => {
        const num = m.number ?? i + 1;
        const escapedLabel = m.label.replace(/'/g, "\\'");
        if (m.muted) {
          return `
    (function() {
      var icon = L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;background:${m.color};border:2px solid #e2e8f0;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.2);opacity:0.8;"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      var mk = L.marker([${m.lat}, ${m.lng}], { icon: icon }).addTo(map).bindPopup('${escapedLabel}');
      window._markers.push(mk);
    })();`;
        }
        return `
    (function() {
      var icon = L.divIcon({
        className: '',
        html: '<div style="width:26px;height:26px;background:${m.color};border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:-apple-system,sans-serif;">${num}</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      var mk = L.marker([${m.lat}, ${m.lng}], { icon: icon }).addTo(map).bindPopup('${escapedLabel}');
      window._markers.push(mk);
    })();`;
      }).join('\n')
    : `
    var icon = L.divIcon({
      className: '',
      html: '<div style="width:28px;height:28px;background:#007AFF;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([${lat}, ${lng}], { icon: icon }).addTo(map)${label ? `.bindPopup('${label.replace(/'/g, "\\'")}')` : ''};`;

  // Route line connecting non-muted markers (itinerary items) in order
  const routeMarkers = markers?.filter(m => !m.muted) ?? [];
  const routeLineJs = routeMarkers.length > 1
    ? `L.polyline([${routeMarkers.map(m => `[${m.lat},${m.lng}]`).join(',')}], { color: '${routeColor}', weight: 2.5, opacity: 0.5, dashArray: '8, 6' }).addTo(map);`
    : '';

  // Auto-fit bounds if multiple markers
  const boundsCoords = markers?.length
    ? `[${markers.map(m => `[${m.lat},${m.lng}]`).join(',')}]`
    : null;
  const fitBoundsJs = boundsCoords
    ? `window._bounds=L.latLngBounds(${boundsCoords});map.fitBounds(window._bounds, { padding: [40, 40] });`
    : '';

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
    var map = L.map('map', { zoomControl: ${isInteractive}, attributionControl: false })
      .setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);
    ${markersJs}
    ${routeLineJs}
    ${fitBoundsJs}
  </script>
</body>
</html>`;

  return (
    <View style={{
      ...(flex ? { flex: 1 } : { height }),
      borderRadius: (flex || borderless) ? 0 : 12,
      overflow: 'hidden',
      borderWidth: (flex || borderless) ? 0 : 1,
      borderColor: '#e5e7eb',
    }}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={{ flex: 1 }}
        scrollEnabled={isInteractive}
        nestedScrollEnabled={isInteractive}
        javaScriptEnabled
      />
    </View>
  );
});
