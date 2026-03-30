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
  /** Render locations as clean pill labels instead of dots */
  labelMarkers?: boolean;
}

function createIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 32 : 22;
  const border = isSelected ? 3 : 2;
  const pulse = isSelected
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${color}20;animation:marker-pulse 2s ease-out infinite;"></div>`
    : '';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${pulse}
      <div style="
        position:relative;width:${size}px;height:${size}px;border-radius:50%;
        background-color:${color};border:${border}px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
        transition:transform 0.2s ease;${isSelected ? 'transform:scale(1.1);' : ''}
      "></div>
    </div>
    <style>@keyframes marker-pulse{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0}}</style>`,
  });
}

function createLabelIcon(name: string): L.DivIcon {
  // Extract emoji and text
  const emoji = name.match(/^\p{Emoji_Presentation}/u)?.[0] ?? ''
  const text = emoji ? name.slice(emoji.length).trim() : name
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div style="
      display:flex;flex-direction:column;align-items:center;gap:2px;
      pointer-events:auto;cursor:default;
    ">
      <div style="font-size:28px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2));">${emoji || '📍'}</div>
      <div style="
        background:white;border-radius:6px;padding:2px 6px;
        box-shadow:0 1px 4px rgba(0,0,0,0.12);
        font-family:system-ui,-apple-system,sans-serif;font-size:10px;font-weight:600;
        color:#1e293b;white-space:nowrap;line-height:1.2;
      ">${text}</div>
    </div>`,
  });
}

// Use CARTO Voyager tiles with user's language
const getUserLang = () => typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
const TILE_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?lang=${getUserLang()}`;
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
  labelMarkers = false,
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

  // Invalidate size when container resizes (e.g. animated panel open)
  useEffect(() => {
    const el = containerRef.current;
    const map = mapRef.current;
    if (!el || !map) return;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(el);
    return () => observer.disconnect();
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
      const icon = labelMarkers ? createLabelIcon(loc.name) : createIcon(loc.color, selected);
      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
      if (!labelMarkers) {
        marker.bindPopup(
          `<div style="font-family:system-ui,sans-serif;min-width:120px;">
            <div style="font-weight:600;font-size:13px;color:#1e293b;margin-bottom:2px;">${loc.name}</div>
            <div style="display:inline-block;font-size:10px;padding:2px 6px;border-radius:4px;background:${loc.color}15;color:${loc.color};font-weight:500;">${loc.category}</div>
          </div>`,
          { closeButton: false },
        );
      }
      markersRef.current.set(loc.id, marker);
      bounds.extend([loc.lat, loc.lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [locations, selectedId, isMulti, labelMarkers]);

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
      className={`w-full rounded-xl overflow-hidden border border-gray-200 isolate ${className}`}
      style={{ height }}
    />
  );
}
