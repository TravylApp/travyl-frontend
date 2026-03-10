'use client';

import { useMemo } from 'react';
import type { RouteLocation, TripRoute } from '@travyl/shared';

interface RouteMapProps {
  route: TripRoute;
  width?: number;
  height?: number;
}

// Simple equirectangular projection (lat/lng to x/y)
function projectToXY(lat: number, lng: number, width: number, height: number, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const padding = 25;
  const mapWidth = width - padding * 2;
  const mapHeight = height - padding * 2;

  // Normalize coordinates
  const x = padding + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * mapWidth;
  const y = padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat || 1)) * mapHeight;

  return { x, y };
}

// Generate curved flight path between two points (arc simulation)
function generateArcPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Calculate distance for arc height
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Arc height based on distance (curves upward like flight paths)
  const arcHeight = dist * 0.2;

  // Perpendicular offset for arc control point
  const perpX = -dy / (dist || 1) * arcHeight;
  const perpY = dx / (dist || 1) * arcHeight;

  const controlX = midX + perpX;
  const controlY = midY + perpY - arcHeight;

  return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
}

// Location marker component
function LocationMarker({
  x,
  y,
  label,
  isOrigin,
  isDestination,
  isStop,
}: {
  x: number;
  y: number;
  label: string;
  isOrigin: boolean;
  isDestination: boolean;
  isStop: boolean;
}) {
  // Color based on type
  let fillColor = '#64748b';
  let strokeColor = '#94a3b8';
  let textColor = '#e2e8f0';

  if (isOrigin) {
    fillColor = '#3b82f6';
    strokeColor = '#60a5fa';
    textColor = '#bfdbfe';
  } else if (isDestination) {
    fillColor = '#10b981';
    strokeColor = '#34d399';
    textColor = '#a7f3d0';
  } else if (isStop) {
    fillColor = '#8b5cf6';
    strokeColor = '#a78bfa';
    textColor = '#ddd6fe';
  }

  return (
    <g>
      {/* Outer glow */}
      <circle
        cx={x}
        cy={y}
        r="8"
        fill={fillColor}
        opacity="0.3"
        filter="url(#markerGlow)"
      />
      {/* Main marker */}
      <circle
        cx={x}
        cy={y}
        r="5"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
      />
      {/* Inner dot */}
      <circle
        cx={x}
        cy={y}
        r="2"
        fill="white"
      />
      {/* Label */}
      <text
        x={x}
        y={y - 12}
        textAnchor="middle"
        fill={textColor}
        fontSize="9"
        fontWeight="600"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        className="drop-shadow-sm"
      >
        {label}
      </text>
    </g>
  );
}

// Generate grid lines
function generateGridLines(width: number, height: number) {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const gridSpacing = 30;

  // Vertical lines
  for (let x = gridSpacing; x < width; x += gridSpacing) {
    lines.push({ x1: x, y1: 0, x2: x, y2: height });
  }

  // Horizontal lines
  for (let y = gridSpacing; y < height; y += gridSpacing) {
    lines.push({ x1: 0, y1: y, x2: width, y2: y });
  }

  return lines;
}

export function RouteMap({ route, width = 280, height = 180 }: RouteMapProps) {
  // Build all route points
  const points = useMemo(() => {
    const all: Array<{ location: RouteLocation; type: 'origin' | 'stop' | 'destination' }> = [
      { location: route.origin, type: 'origin' },
    ];

    if (route.stops) {
      route.stops.forEach((stop) => {
        all.push({ location: stop, type: 'stop' });
      });
    }

    route.destinations.forEach((dest) => {
      all.push({ location: dest, type: 'destination' });
    });

    return all;
  }, [route]);

  // Calculate bounds for projection
  const bounds = useMemo(() => {
    const lats = points.map((p) => p.location.lat);
    const lngs = points.map((p) => p.location.lng);

    // Add padding to bounds
    const latPadding = (Math.max(...lats) - Math.min(...lats)) * 0.3 || 15;
    const lngPadding = (Math.max(...lngs) - Math.min(...lngs)) * 0.3 || 15;

    return {
      minLat: Math.min(...lats) - latPadding,
      maxLat: Math.max(...lats) + latPadding,
      minLng: Math.min(...lngs) - lngPadding,
      maxLng: Math.max(...lngs) + lngPadding,
    };
  }, [points]);

  // Project points to screen coordinates
  const projectedPoints = useMemo(() => {
    return points.map((p) => ({
      ...projectToXY(p.location.lat, p.location.lng, width, height, bounds),
      location: p.location,
      type: p.type,
    }));
  }, [points, bounds, width, height]);

  // Generate arc path segments
  const pathSegments = useMemo(() => {
    const segments: Array<{ d: string }> = [];

    for (let i = 0; i < projectedPoints.length - 1; i++) {
      const p1 = projectedPoints[i];
      const p2 = projectedPoints[i + 1];
      segments.push({
        d: generateArcPath(p1.x, p1.y, p2.x, p2.y),
      });
    }

    return segments;
  }, [projectedPoints]);

  // Generate grid lines
  const gridLines = useMemo(() => generateGridLines(width, height), [width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      style={{ display: 'block' }}
    >
      <defs>
        {/* Background gradient */}
        <linearGradient id="mapBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0c1929" />
          <stop offset="50%" stopColor="#132337" />
          <stop offset="100%" stopColor="#1a3352" />
        </linearGradient>
        {/* Flight path gradient */}
        <linearGradient id="flightPathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        {/* Marker glow filter */}
        <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Path glow filter */}
        <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#mapBgGradient)" />

      {/* Grid lines */}
      {gridLines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#1e3a5f"
          strokeWidth="0.5"
          opacity="0.5"
        />
      ))}

      {/* Decorative continents (simple ellipses) */}
      <g opacity="0.3">
        <ellipse cx={width * 0.7} cy={height * 0.6} rx="30" ry="20" fill="#4a90d9" />
        <ellipse cx={width * 0.5} cy={height * 0.3} rx="25" ry="15" fill="#4a90d9" />
      </g>

      {/* Flight path glow */}
      {pathSegments.map((segment, i) => (
        <path
          key={`glow-${i}`}
          d={segment.d}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.3"
          filter="url(#pathGlow)"
        />
      ))}

      {/* Flight paths */}
      {pathSegments.map((segment, i) => (
        <path
          key={`path-${i}`}
          d={segment.d}
          fill="none"
          stroke="url(#flightPathGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="8,4"
        />
      ))}

      {/* Airplane icon at midpoint of first segment */}
      {pathSegments[0] && projectedPoints.length >= 2 && (
        <g transform={`translate(${(projectedPoints[0].x + projectedPoints[1].x) / 2}, ${(projectedPoints[0].y + projectedPoints[1].y) / 2 - 8})`}>
          <text
            fontSize="12"
            fill="#fbbf24"
            textAnchor="middle"
            filter="url(#markerGlow)"
          >
            ✈
          </text>
        </g>
      )}

      {/* Location markers */}
      {projectedPoints.map((point, i) => (
        <LocationMarker
          key={`${point.location.city || point.location.name}-${i}`}
          x={point.x}
          y={point.y}
          label={point.location.iata || point.location.city || point.location.name}
          isOrigin={point.type === 'origin'}
          isDestination={point.type === 'destination'}
          isStop={point.type === 'stop'}
        />
      ))}

      {/* Bottom info bar */}
      <rect x="0" y={height - 20} width={width} height="20" fill="#0c1929" opacity="0.85" />

      {/* Route info */}
      <text
        x={10}
        y={height - 7}
        fill="#60a5fa"
        fontSize="8"
        fontWeight="600"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {projectedPoints[0]?.location.city}
      </text>

      <text
        x={width / 2}
        y={height - 7}
        fill="#94a3b8"
        fontSize="7"
        textAnchor="middle"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {points.length} {points.length === 1 ? 'stop' : 'stops'}
      </text>

      <text
        x={width - 10}
        y={height - 7}
        fill="#34d399"
        fontSize="8"
        fontWeight="600"
        textAnchor="end"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {projectedPoints[projectedPoints.length - 1]?.location.city}
      </text>
    </svg>
  );
}
