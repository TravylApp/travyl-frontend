'use client';

import { useMemo, useState, useEffect } from 'react';
import type { RouteLocation, TripRoute } from '@travyl/shared';

interface LowPolyGlobeProps {
  route: TripRoute;
  width?: number;
  height?: number;
}

// Low-poly triangle colors
const POLY_COLORS = [
  '#1e3a5f', '#234b7a', '#2a5d96', '#2563eb', '#1d4ed8',
  '#1e40af', '#1e3a8a', '#172554', '#0f172a', '#0c1929'
];

// Generate random low-poly triangles
function generateLowPolyTriangles(width: number, height: number, count: number = 25) {
  const triangles: Array<{ points: string; color: string; opacity: number }> = [];

  for (let i = 0; i < count; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = x1 + (Math.random() - 0.5) * 60;
    const y2 = y1 + Math.random() * 40;
    const x3 = x1 + (Math.random() - 0.5) * 60;
    const y3 = y1 + Math.random() * 40;

    triangles.push({
      points: `${x1},${y1} ${x2},${y2} ${x3},${y3}`,
      color: POLY_COLORS[Math.floor(Math.random() * POLY_COLORS.length)],
      opacity: 0.3 + Math.random() * 0.5,
    });
  }

  return triangles;
}

// Simple equirectangular projection
function projectToXY(lat: number, lng: number, width: number, height: number) {
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / 6;

  const x = centerX + (lng / 180) * (width * 0.4);
  const y = centerY - (lat / 90) * (height * 0.35);

  return { x, y };
}

// 3D Pin component with animation
function Pin3D({
  x,
  y,
  label,
  color,
  delay = 0,
  isOrigin,
  isDestination,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  delay?: number;
  isOrigin?: boolean;
  isDestination?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Pin shadow
  const shadowOffset = 3;
  const pinHeight = isOrigin || isDestination ? 20 : 14;

  return (
    <g
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
        transformOrigin: `${x}px ${y}px`,
      }}
    >
      {/* Pin shadow */}
      <ellipse
        cx={x + shadowOffset}
        cy={y + 2}
        rx={4}
        ry={2}
        fill="rgba(0,0,0,0.3)"
      />

      {/* Pin body - 3D effect */}
      <path
        d={`M ${x} ${y} L ${x - 5} ${y - pinHeight * 0.6} Q ${x} ${y - pinHeight} ${x + 5} ${y - pinHeight * 0.6} Z`}
        fill={color}
        stroke="white"
        strokeWidth="1"
        style={{
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
        }}
      />

      {/* Pin highlight */}
      <path
        d={`M ${x - 2} ${y - pinHeight * 0.5} L ${x - 4} ${y - pinHeight * 0.3} L ${x - 1} ${y - 5} Z`}
        fill="rgba(255,255,255,0.4)"
      />

      {/* Pin top circle */}
      <circle
        cx={x}
        cy={y - pinHeight}
        r={isOrigin || isDestination ? 6 : 4}
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
        }}
      />

      {/* Inner dot */}
      <circle
        cx={x}
        cy={y - pinHeight}
        r={isOrigin || isDestination ? 2.5 : 1.5}
        fill="white"
      />

      {/* Label */}
      <text
        x={x}
        y={y - pinHeight - 12}
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="600"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}
      >
        {label}
      </text>
    </g>
  );
}

// Animated flight path
function FlightPath3D({
  points,
  delay = 200,
}: {
  points: Array<{ x: number; y: number }>;
  delay?: number;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress((p) => (p >= 1 ? 1 : p + 0.02));
      }, 20);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (points.length < 2) return null;

  // Generate curved path
  const pathD = useMemo(() => {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = Math.min(prev.y, curr.y) - 20; // Arc up
      d += ` Q ${midX} ${midY} ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  return (
    <g>
      {/* Path glow */}
      <path
        d={pathD}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.3"
        style={{
          filter: 'blur(4px)',
        }}
      />
      {/* Animated path */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#pathGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1000"
        strokeDashoffset={1000 * (1 - progress)}
        style={{
          transition: 'stroke-dashoffset 0.1s linear',
        }}
      />
      {/* Airplane at the end */}
      {progress > 0.5 && (
        <g
          style={{
            opacity: progress > 0.8 ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        >
          <text
            x={points[points.length - 1].x - 15}
            y={points[points.length - 1].y - 25}
            fontSize="14"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
          >
            ✈️
          </text>
        </g>
      )}
    </g>
  );
}

// Grid lines for globe effect
function GlobeGrid({ width, height }: { width: number; height: number }) {
  const lines = useMemo(() => {
    const result: Array<{ x1: number; y1: number; x2: number; y2: number; opacity: number }> = [];

    // Latitude lines (horizontal)
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      result.push({
        x1: 10,
        y1: y,
        x2: width - 10,
        y2: y,
        opacity: 0.15 + Math.random() * 0.1,
      });
    }

    // Longitude lines (vertical, curved effect)
    for (let i = 1; i < 6; i++) {
      const x = (width / 6) * i;
      result.push({
        x1: x,
        y1: 10,
        x2: x,
        y2: height - 10,
        opacity: 0.15 + Math.random() * 0.1,
      });
    }

    return result;
  }, [width, height]);

  return (
    <g>
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#3b82f6"
          strokeWidth="0.5"
          opacity={line.opacity}
        />
      ))}
    </g>
  );
}

export function LowPolyGlobe({ route, width = 280, height = 200 }: LowPolyGlobeProps) {
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

  // Project points
  const projectedPoints = useMemo(() => {
    return points.map((p) => ({
      ...projectToXY(p.location.lat, p.location.lng, width, height),
      location: p.location,
      type: p.type,
    }));
  }, [points, width, height]);

  // Generate low-poly triangles
  const triangles = useMemo(() => generateLowPolyTriangles(width, height), [width, height]);

  // Pin colors
  const getPinColor = (type: string) => {
    switch (type) {
      case 'origin':
        return '#3b82f6';
      case 'destination':
        return '#10b981';
      case 'stop':
        return '#8b5cf6';
      default:
        return '#64748b';
    }
  };

  return (
    <div
      style={{
        perspective: '500px',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          display: 'block',
          transform: 'rotateX(5deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        <defs>
          {/* Background gradient */}
          <radialGradient id="globeBg" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Path gradient */}
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Globe mask for rounded corners */}
          <clipPath id="globeClip">
            <rect x="0" y="0" width={width} height={height} rx="12" />
          </clipPath>
        </defs>

        <g clipPath="url(#globeClip)">
          {/* Background */}
          <rect width={width} height={height} fill="url(#globeBg)" />

          {/* Low-poly triangles */}
          {triangles.map((tri, i) => (
            <polygon
              key={i}
              points={tri.points}
              fill={tri.color}
              opacity={tri.opacity}
            />
          ))}

          {/* Globe grid */}
          <GlobeGrid width={width} height={height} />

          {/* Decorative circles (continents hint) */}
          <g opacity="0.2">
            <ellipse cx={width * 0.3} cy={height * 0.4} rx="35" ry="25" fill="#3b82f6" />
            <ellipse cx={width * 0.7} cy={height * 0.5} rx="25" ry="30" fill="#3b82f6" />
            <ellipse cx={width * 0.5} cy={height * 0.7} rx="20" ry="15" fill="#3b82f6" />
          </g>

          {/* Flight paths */}
          <FlightPath3D points={projectedPoints} delay={300} />

          {/* Location pins */}
          {projectedPoints.map((point, i) => (
            <Pin3D
              key={`${point.location.city || point.location.name}-${i}`}
              x={point.x}
              y={point.y}
              label={point.location.iata || point.location.city || point.location.name}
              color={getPinColor(point.type)}
              delay={100 + i * 150}
              isOrigin={point.type === 'origin'}
              isDestination={point.type === 'destination'}
            />
          ))}

          {/* Bottom info bar */}
          <rect x="0" y={height - 24} width={width} height="24" fill="#020617" opacity="0.9" />

          {/* Route summary */}
          <text
            x={12}
            y={height - 9}
            fill="#60a5fa"
            fontSize="8"
            fontWeight="600"
          >
            {projectedPoints[0]?.location.iata || projectedPoints[0]?.location.city}
          </text>

          <text
            x={width / 2}
            y={height - 9}
            fill="#94a3b8"
            fontSize="7"
            textAnchor="middle"
          >
            {points.length} {points.length === 1 ? 'location' : 'locations'}
          </text>

          <text
            x={width - 12}
            y={height - 9}
            fill="#34d399"
            fontSize="8"
            fontWeight="600"
            textAnchor="end"
          >
            {projectedPoints[projectedPoints.length - 1]?.location.iata ||
              projectedPoints[projectedPoints.length - 1]?.location.city}
          </text>
        </g>
      </svg>
    </div>
  );
}
