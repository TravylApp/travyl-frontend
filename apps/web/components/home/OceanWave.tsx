"use client";

import { useMemo } from "react";

type Harmonic = { amplitude: number; frequency: number; phase: number };

interface LayerRecipe {
  harmonics: Harmonic[];
  yOffset: number;
}

// Integer frequencies → seamless 1200px cycle
const RECIPES: Record<string, LayerRecipe> = {
  surface: {
    harmonics: [
      { amplitude: -8, frequency: 1, phase: 0.3 },
      { amplitude: -3.5, frequency: 3, phase: 1.5 },
      { amplitude: -1.5, frequency: 6, phase: 2.8 },
    ],
    yOffset: 48,
  },
  swellMid: {
    harmonics: [
      { amplitude: -7.5, frequency: 1, phase: 1.8 },
      { amplitude: -4, frequency: 2, phase: 0.7 },
      { amplitude: -2, frequency: 5, phase: 3.9 },
    ],
    yOffset: 75,
  },
  swellDeep: {
    harmonics: [
      { amplitude: -7, frequency: 1, phase: 3.2 },
      { amplitude: -3.5, frequency: 2, phase: 2.1 },
      { amplitude: -1.5, frequency: 4, phase: 0.4 },
    ],
    yOffset: 108,
  },
  abyss: {
    harmonics: [
      { amplitude: -5.5, frequency: 1, phase: 5.4 },
      { amplitude: -2.5, frequency: 2, phase: 3.1 },
    ],
    yOffset: 130,
  },
  sandWash: {
    harmonics: [
      { amplitude: -3, frequency: 1, phase: 6.0 },
      { amplitude: -1.2, frequency: 3, phase: 1.2 },
    ],
    yOffset: 142,
  },
  sandBase: {
    harmonics: [
      { amplitude: -1.8, frequency: 1, phase: 0.5 },
      { amplitude: -0.8, frequency: 2, phase: 4.0 },
    ],
    yOffset: 152,
  },
};

function makePath(
  width: number,
  bottom: number,
  recipe: LayerRecipe,
  segments: number,
): string {
  const step = width / segments;
  const pts: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = i * step;
    let y = recipe.yOffset;
    for (const h of recipe.harmonics) {
      y += h.amplitude * Math.sin((2 * Math.PI * h.frequency * x) / width + h.phase);
    }
    pts.push(`${Math.round(x)},${Math.round(y)}`);
  }
  return `M${pts.join(" L")} L${width},${bottom} L0,${bottom} Z`;
}

// Full crest polyline — used for the glow + core foam strokes
function makeCrestLine(
  width: number,
  recipe: LayerRecipe,
  segments: number,
): string {
  const step = width / segments;
  const pts: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = i * step;
    let y = recipe.yOffset;
    for (const h of recipe.harmonics) {
      y += h.amplitude * Math.sin((2 * Math.PI * h.frequency * x) / width + h.phase);
    }
    pts.push(`${Math.round(x)},${Math.round(y)}`);
  }
  return `M${pts.join(" L")}`;
}

/** Short whitecap segments at local peaks — mimics breaking foam */
function makeWhitecaps(width: number, recipe: LayerRecipe, segments: number): string[] {
  const step = width / segments;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = i * step;
    let y = recipe.yOffset;
    for (const h of recipe.harmonics) {
      y += h.amplitude * Math.sin((2 * Math.PI * h.frequency * x) / width + h.phase);
    }
    pts.push({ x: Math.round(x), y: Math.round(y) });
  }

  // Find local minima (peak = highest point on screen = lowest y)
  // Create a short stroke spanning the peak and its immediate neighbors
  const caps: string[] = [];
  for (let i = 2; i < pts.length - 2; i++) {
    const p = pts[i];
    if (p.y < pts[i - 1].y && p.y < pts[i + 1].y && p.y < pts[i - 2].y && p.y < pts[i + 2].y) {
      const start = pts[Math.max(0, i - 2)];
      const end = pts[Math.min(pts.length - 1, i + 2)];
      caps.push(`M${start.x},${start.y} L${end.x},${end.y}`);
    }
  }
  return caps;
}

interface LayerDef {
  id: string;
  className: string;
  gradient: string;
  segments: number;
  showFoam: boolean;
}

const OCEAN_LAYERS: LayerDef[] = [
  { id: "surface", className: "wave-5s", gradient: "url(#g-surface)", segments: 36, showFoam: true },
  { id: "swellMid", className: "wave-8s", gradient: "url(#g-swellMid)", segments: 30, showFoam: true },
  { id: "swellDeep", className: "wave-12s", gradient: "url(#g-swellDeep)", segments: 24, showFoam: true },
  { id: "abyss", className: "wave-18s", gradient: "url(#g-abyss)", segments: 18, showFoam: false },
];

// Predetermined sparkle positions (scattered x,y) — rendered as tiny white dots
const SPARKLES = [
  { cx: 120, cy: 32 }, { cx: 340, cy: 28 }, { cx: 560, cy: 35 }, { cx: 780, cy: 30 },
  { cx: 980, cy: 25 }, { cx: 1150, cy: 33 }, { cx: 220, cy: 55 }, { cx: 650, cy: 52 },
  { cx: 880, cy: 48 }, { cx: 1050, cy: 58 },
];

export function OceanWave() {
  const paths = useMemo(() => {
    const result: Record<string, string> = {};
    for (const l of OCEAN_LAYERS) {
      result[l.id] = makePath(1200, 160, RECIPES[l.id], l.segments);
    }
    result["sandWash"] = makePath(1200, 160, RECIPES.sandWash, 14);
    result["sandBase"] = makePath(1200, 160, RECIPES.sandBase, 10);
    return result;
  }, []);

  const crests = useMemo(() => {
    const result: Record<string, string> = {};
    for (const l of OCEAN_LAYERS) {
      if (l.showFoam) {
        result[l.id] = makeCrestLine(1200, RECIPES[l.id], l.segments);
      }
    }
    return result;
  }, []);

  const whitecaps = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const l of OCEAN_LAYERS) {
      if (l.showFoam) {
        result[l.id] = makeWhitecaps(1200, RECIPES[l.id], l.segments);
      }
    }
    return result;
  }, []);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 160, marginBottom: -1 }}>
      <style>{`
        @keyframes waveScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-1200px); }
        }
        .wave-5s  { animation: waveScroll 5s linear infinite; }
        .wave-8s  { animation: waveScroll 8s linear infinite; }
        .wave-12s { animation: waveScroll 12s linear infinite; }
        .wave-18s { animation: waveScroll 18s linear infinite; }
      `}</style>

      <svg
        className="absolute top-0 left-0"
        viewBox="0 0 2400 160"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "200%", height: "100%" }}
      >
        <defs>
          {/* Ocean color spectrum — surface teal → abyss navy */}
          <linearGradient id="g-surface" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#63b3cd" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#3a8fa8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1e6b8a" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="g-swellMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d8098" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#155a78" stopOpacity="0.80" />
          </linearGradient>
          <linearGradient id="g-swellDeep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a627a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0c3d5a" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id="g-abyss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#003594" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#002255" />
          </linearGradient>

          {/* Pre-built paths */}
          {OCEAN_LAYERS.map(({ id }) => (
            <path key={id} id={`p-${id}`} d={paths[id]} />
          ))}
        </defs>

        {/* Ocean layers — paint bottom-to-top so depth shows through */}
        {[...OCEAN_LAYERS].reverse().map(({ id, className, gradient }) => (
          <g key={id} className={className} fill={gradient}>
            <use href={`#p-${id}`} />
            <use href={`#p-${id}`} x="1200" />
          </g>
        ))}

        {/* ── Foam / white peaks ──────────────────────────── */}

        {/* Glow halo — wide, semi-transparent */}
        {OCEAN_LAYERS.filter((l) => l.showFoam).map(({ id, className }) => (
          <g key={`glow-${id}`} className={className} fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d={crests[id]} />
            <path d={crests[id]} transform="translate(1200,0)" />
          </g>
        ))}

        {/* Core foam line — sharp white */}
        {OCEAN_LAYERS.filter((l) => l.showFoam).map(({ id, className }) => (
          <g key={`foam-${id}`} className={className} fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={crests[id]} />
            <path d={crests[id]} transform="translate(1200,0)" />
          </g>
        ))}

        {/* Whitecap bursts — short thick strokes at peaks only */}
        {OCEAN_LAYERS.filter((l) => l.showFoam).map(({ id, className }) => (
          <g key={`cap-${id}`} className={className} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.90">
            {whitecaps[id].map((d, i) => (
              <path key={i} d={d} />
            ))}
            {/* Duplicate for 2400px seamless scroll */}
            {whitecaps[id].map((d, i) => (
              <path key={`d-${i}`} d={d} transform="translate(1200,0)" />
            ))}
          </g>
        ))}

        {/* Sparkle dots — tiny reflections scattered across the surface */}
        <g className="wave-8s" fill="white" opacity="0.55">
          {SPARKLES.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r="1.2" />
          ))}
          {SPARKLES.map((s, i) => (
            <circle key={`d-${i}`} cx={s.cx + 1200} cy={s.cy} r="1.2" />
          ))}
        </g>

        {/* Sand-wash */}
        <use href={`#p-sandWash`} fill="var(--sand-wash)" opacity="0.40" />

        {/* Sand-base footer blend */}
        <use href={`#p-sandBase`} fill="var(--sand-base)" />
      </svg>
    </div>
  );
}
