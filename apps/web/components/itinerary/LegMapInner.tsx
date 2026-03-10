'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TripLeg } from './LegMap';

// Fix default marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LegMapInnerProps {
  legs: TripLeg[];
  selectedLegId: string | null;
  hoveredLegId: string | null;
  onLegSelect: (legId: string) => void;
  onLegHover: (legId: string | null) => void;
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

// Create a 3D-style pin marker (like Google Maps)
function createPinMarker(number: number, isSelected: boolean, isOrigin?: boolean): L.DivIcon {
  const bgColor = isOrigin ? '#22c55e' : '#1e3a5f';
  const size = isSelected ? 44 : 36;
  const fontSize = isSelected ? 14 : 12;

  return L.divIcon({
    className: '',
    iconSize: [size, size + 12], // Extra height for the pin point
    iconAnchor: [size / 2, size + 12], // Bottom center of the pin
    popupAnchor: [0, -(size + 16)],
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        cursor: pointer;
        filter: drop-shadow(0 3px 4px rgba(0,0,0,0.3));
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        transition: transform 0.2s ease;
      ">
        <!-- Pin body (circle) -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50% 50% 50% 0;
          background: ${bgColor};
          transform: rotate(-45deg);
          box-shadow: inset 0 -3px 6px rgba(0,0,0,0.2);
        ">
          <!-- Highlight -->
          <div style="
            position: absolute;
            top: 4px;
            left: 4px;
            width: ${size * 0.35}px;
            height: ${size * 0.35}px;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
          "></div>
        </div>
        <!-- Number inside -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: ${fontSize}px;
          font-family: system-ui, -apple-system, sans-serif;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        ">${isOrigin ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>' : number}</div>
        <!-- Pin point (triangle) -->
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 12px solid ${bgColor};
        "></div>
        <!-- Selection ring -->
        ${isSelected ? `
          <div style="
            position: absolute;
            top: -4px;
            left: -4px;
            width: ${size + 8}px;
            height: ${size + 8}px;
            border-radius: 50%;
            border: 3px solid ${bgColor};
            opacity: 0.5;
            animation: pulse 1.5s ease-in-out infinite;
          "></div>
        ` : ''}
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
      </style>
    `,
  });
}

// Create a curved flight path between two points
function createCurvedPath(
  start: L.LatLng,
  end: L.LatLng,
  isSelected: boolean
): L.Polyline {
  // Calculate midpoint with offset for curve effect
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;

  // Calculate distance for arc height
  const distance = start.distanceTo(end);
  const arcHeight = Math.min(distance * 0.15, 500000); // Max 500km arc

  // Offset midpoint perpendicular to the line
  const angle = Math.atan2(end.lat - start.lat, end.lng - start.lng);
  const perpAngle = angle + Math.PI / 2;

  // Alternate curve direction based on general direction
  const direction = start.lng > end.lng ? -1 : 1;
  const arcMidLat = midLat + Math.sin(perpAngle) * (arcHeight / 111000) * direction;
  const arcMidLng = midLng + Math.cos(perpAngle) * (arcHeight / 111000) * direction;

  // Create bezier curve points
  const points: [number, number][] = [];
  const steps = 50;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier curve
    const lat =
      Math.pow(1 - t, 2) * start.lat +
      2 * (1 - t) * t * arcMidLat +
      Math.pow(t, 2) * end.lat;
    const lng =
      Math.pow(1 - t, 2) * start.lng +
      2 * (1 - t) * t * arcMidLng +
      Math.pow(t, 2) * end.lng;
    points.push([lat, lng]);
  }

  // Create polyline with dashed style
  const color = isSelected ? '#1e3a5f' : '#64748b';
  const weight = isSelected ? 3 : 2;
  const opacity = isSelected ? 0.9 : 0.5;

  return L.polyline(points, {
    color,
    weight,
    opacity,
    dashArray: '8, 8',
    lineCap: 'round',
    lineJoin: 'round',
  });
}

// Create animated dots along the path
function createAnimatedDots(polyline: L.Polyline, isSelected: boolean): L.Polyline[] {
  const points = polyline.getLatLngs() as L.LatLng[];
  const dots: L.Polyline[] = [];
  const dotCount = 3;
  const dotLength = 3; // Number of points per dot

  for (let i = 0; i < dotCount; i++) {
    const startIdx = Math.floor((points.length / dotCount) * i);
    const dotPoints: [number, number][] = [];

    for (let j = 0; j < dotLength && startIdx + j < points.length; j++) {
      dotPoints.push([points[startIdx + j].lat, points[startIdx + j].lng]);
    }

    if (dotPoints.length >= 2) {
      const dot = L.polyline(dotPoints, {
        color: isSelected ? '#1e3a5f' : '#64748b',
        weight: isSelected ? 4 : 3,
        opacity: 0.8,
      });
      dots.push(dot);
    }
  }

  return dots;
}

export default function LegMapInner({
  legs,
  selectedLegId,
  hoveredLegId,
  onLegSelect,
  onLegHover,
}: LegMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routesRef = useRef<L.Polyline[]>([]);
  const dotsRef = useRef<L.Polyline[]>([]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 18,
    }).addTo(map);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      routesRef.current = [];
      dotsRef.current = [];
    };
  }, []);

  // Update markers and routes when legs change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || legs.length === 0) return;

    // Clear existing markers and routes
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    routesRef.current.forEach((r) => r.remove());
    routesRef.current = [];
    dotsRef.current.forEach((d) => d.remove());
    dotsRef.current = [];

    const bounds = L.latLngBounds([]);

    // Add origin marker for first leg
    const firstLeg = legs[0];
    if (firstLeg.originLat && firstLeg.originLng) {
      const originIcon = createPinMarker(0, false, true);
      const originMarker = L.marker([firstLeg.originLat, firstLeg.originLng], {
        icon: originIcon,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif;padding:4px;">
            <strong style="font-size:14px;">${firstLeg.origin}</strong>
            ${firstLeg.originCode ? `<span style="color:#64748b;font-size:12px;"> (${firstLeg.originCode})</span>` : ''}
            <div style="color:#22c55e;font-size:11px;margin-top:2px;">Trip Start</div>
          </div>`,
          { closeButton: false }
        );
      markersRef.current.set('origin', originMarker);
      bounds.extend([firstLeg.originLat, firstLeg.originLng]);
    }

    // Add destination markers and routes for each leg
    legs.forEach((leg, index) => {
      if (!leg.originLat || !leg.originLng || !leg.destinationLat || !leg.destinationLng) return;

      const isSelected = leg.id === selectedLegId;
      const isHovered = leg.id === hoveredLegId;
      const highlight = isSelected || isHovered;

      // Create route path
      const route = createCurvedPath(
        L.latLng(leg.originLat, leg.originLng),
        L.latLng(leg.destinationLat, leg.destinationLng),
        highlight
      );
      route.addTo(map);
      routesRef.current.push(route);

      // Add animated dots for selected route
      if (highlight) {
        const dots = createAnimatedDots(route, isSelected);
        dots.forEach((dot) => {
          dot.addTo(map);
          dotsRef.current.push(dot);
        });
      }

      // Add destination marker
      const destIcon = createPinMarker(index + 1, highlight);
      const destMarker = L.marker([leg.destinationLat, leg.destinationLng], {
        icon: destIcon,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif;padding:4px;min-width:150px;">
            <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Leg ${index + 1}</div>
            <strong style="font-size:14px;">${leg.destination}</strong>
            ${leg.destinationCode ? `<span style="color:#64748b;font-size:12px;"> (${leg.destinationCode})</span>` : ''}
            <div style="margin-top:6px;font-size:11px;color:#475569;">
              ${leg.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${leg.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div style="font-size:11px;color:#1e3a5f;font-weight:600;margin-top:2px;">
              ${leg.dayCount} ${leg.dayCount === 1 ? 'day' : 'days'}
            </div>
          </div>`,
          { closeButton: false }
        );

      // Click handler
      destMarker.on('click', () => {
        onLegSelect(leg.id);
      });

      // Hover handlers
      destMarker.on('mouseover', () => {
        onLegHover(leg.id);
      });
      destMarker.on('mouseout', () => {
        onLegHover(null);
      });

      markersRef.current.set(leg.id, destMarker);
      bounds.extend([leg.destinationLat, leg.destinationLng]);
    });

    // Fit bounds with padding
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 6,
      });
    }
  }, [legs, selectedLegId, hoveredLegId, onLegSelect, onLegHover]);

  // Animate dots
  useEffect(() => {
    if (dotsRef.current.length === 0) return;

    let animationFrame: number;
    let offset = 0;

    const animate = () => {
      offset += 0.5;
      dotsRef.current.forEach((dot, i) => {
        const points = dot.getLatLngs() as L.LatLng[];
        if (points.length < 2) return;

        // Simple animation - pulse opacity
        const opacity = 0.5 + 0.5 * Math.sin((offset + i * 2) * 0.1);
        dot.setStyle({ opacity });
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [selectedLegId, hoveredLegId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '100%' }}
    />
  );
}
