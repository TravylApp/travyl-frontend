'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon paths (Leaflet + bundlers issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapLocation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  color: string;
  category: string;
}

interface LeafletMapProps {
  /** Single-location mode */
  lat?: number;
  lng?: number;
  label?: string;
  /** Multi-location mode */
  locations?: MapLocation[];
  selectedId?: string;
  /** Shared */
  zoom?: number;
  height?: number | string;
  className?: string;
}

function createIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 28 : 20;
  const border = isSelected ? 3 : 2;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background-color:${color};border:${border}px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3)${isSelected ? ', 0 0 0 3px ' + color + '60' : ''};
      transition:transform 0.2s ease;${isSelected ? 'transform:scale(1.15);' : ''}
    "></div>`,
  });
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

export default function LeafletMap({
  lat,
  lng,
  label,
  locations,
  selectedId,
  zoom = 13,
  height = 300,
  className = '',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const isMulti = !!locations?.length;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = isMulti
      ? [locations![0].lat, locations![0].lng]
      : [lat ?? 0, lng ?? 0];

    const map = L.map(containerRef.current).setView(center, zoom);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 20 }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single-location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || isMulti || lat == null || lng == null) return;

    // Clear old
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    map.setView([lat, lng], zoom);
    const icon = createIcon('#1e3a5f', false);
    const marker = L.marker([lat, lng], { icon }).addTo(map);
    if (label) marker.bindPopup(label);
    markersRef.current.set('single', marker);
  }, [lat, lng, zoom, label, isMulti]);

  // Multi-location markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMulti) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    if (!locations!.length) return;

    const bounds = L.latLngBounds([]);
    locations!.forEach((loc) => {
      const selected = loc.id === selectedId;
      const icon = createIcon(loc.color, selected);
      const marker = L.marker([loc.lat, loc.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif;min-width:120px;">
            <div style="font-weight:600;font-size:13px;color:#1e293b;margin-bottom:2px;">${loc.name}</div>
            <div style="display:inline-block;font-size:10px;padding:2px 6px;border-radius:4px;background:${loc.color}15;color:${loc.color};font-weight:500;">${loc.category}</div>
          </div>`,
          { closeButton: false },
        );
      markersRef.current.set(loc.id, marker);
      bounds.extend([loc.lat, loc.lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [locations, selectedId, isMulti]);

  // Pan to selected
  useEffect(() => {
    if (!selectedId || !isMulti) return;
    const marker = markersRef.current.get(selectedId);
    if (marker) {
      marker.openPopup();
      mapRef.current?.panTo(marker.getLatLng(), { animate: true, duration: 0.4 });
    }
  }, [selectedId, isMulti]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-xl overflow-hidden border border-gray-200 ${className}`}
      style={{ height }}
    />
  );
}
