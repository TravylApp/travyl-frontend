# 3D Paper Plane Takeoff Animation

**Date:** 2026-05-05
**Linear:** TBD (new issue needed — independent feature)
**Branch:** feature/ui-homogenization

## Overview

Replace the existing 2D Canvas-based paper plane animation in `TakeoffTransition.tsx` with a 3D interactive scene using React Three Fiber. While the trip generates, users can click/tap to keep a 3D paper plane aloft over a low-poly countryside landscape.

## Motivation

- Current 2D Canvas animation feels flat and passive
- 3D interactive plane gives users something playful to do during the ~3-8 second loading wait
- Aligns with the app's travel theme (paper plane as the core motif)
- Low-poly aesthetic fits modern web design trends

## Architecture

### Component Tree

```
TakeoffTransition (existing wrapper, modified)
  ├── TakeoffScene3D (NEW — dynamically imported, renders behind HUD)
  │     └── <Canvas> (R3F, lazy-loaded, ssr: false)
  │           ├── <ambientLight intensity={0.5} />
  │           ├── <directionalLight position={[10, 15, 10]} />
  │           ├── <Sky /> (gradient atmosphere)
  │           ├── <Terrain /> (low-poly rolling hills)
  │           ├── <Clouds /> (3-5 floating clusters)
  │           ├── <PaperPlane /> (GLB model with flight physics)
  │           └── <CameraController /> (smooth follow camera)
  │
  └── HUD overlay (STAYS in TakeoffTransition — unchanged)
        ├── Progress bar (unchanged)
        ├── Cycling status messages (unchanged)
        └── Error UI (unchanged)
```

Note: The HUD (progress bar, status messages, error UI) remains in TakeoffTransition, rendered on top of the 3D scene via z-index. TakeoffScene3D does NOT own any UI overlay elements.

**Design trade-off acknowledged:** The current 2D animation launches the plane from the exact click position (`buttonRect`). The 3D scene instead enters from bottom-center. This is a deliberate simplification — the 3D scene needs a fixed camera framing to look correct, and launching from a button position would require dynamic camera repositioning that adds complexity without proportional value.

### Props Contract: TakeoffScene3D → TakeoffTransition

```tsx
interface TakeoffScene3DProps {
  completed: boolean;
  onExit: () => void;  // called when exit animation finishes, parent dismounts
}
```

Parent controls lifecycle through conditional rendering (`{showScene && <TakeoffScene3D .../>}`). When `completed` transitions to `true`, the scene plays its victory loop + off-screen glide, then calls `onExit`. The parent (TakeoffTransition) then:

1. Sets internal `showScene = false` to unmount the 3D scene
2. Fires its own `onComplete` callback to `page.tsx`

This is the chain: `TakeoffScene3D.onExit → TakeoffTransition sets showScene=false → TakeoffTransition.onComplete → page.tsx handles navigation`.

Error handling is one-way: TakeoffScene3D handles internal errors (GLB load failure → fallback mesh, WebGL unsupported → renders nothing). The parent's Error Boundary above the dynamic import catches catastrophic failures (broken bundle). TakeoffTransition's existing error UI remains the single source of truth for user-facing error states.

### Lazy Loading & Error Boundary

The entire 3D scene is lazy-loaded via `next/dynamic` with `ssr: false`:

```tsx
const TakeoffScene3D = dynamic(() => import('./TakeoffScene3D'), {
  ssr: false,
  loading: () => <LoadingFallback />,  // spinner while bundles load
})
```

TakeoffTransition wraps the `dynamic()` import in a React Error Boundary. If the import fails (network error, broken bundle), the Error Boundary catches it and renders a solid blue background with the existing HUD — the trip creation flow is never blocked by a visual enhancement.

### Dependencies (new)

Installed to `apps/web`:

- `three` — 3D engine (~25 KB gzipped, tree-shakeable)
- `@react-three/fiber` — React bindings for Three.js (~9 KB)
- `@react-three/drei` — helpers (Sky, OrbitControls, etc.) (~4 KB tree-shaken)

Total bundle impact: ~38 KB gzipped, loaded only when the takeoff screen shows.

## Scene Design

### Environment

- **Sky:** Soft gradient atmosphere — light blue at horizon (#B0E0E6), deepening to (#4A90D9) overhead. Subtle fog for distance.
- **Terrain:** Low-poly plane geometry (~50x50 segments), vertex colors in green tones (#5A8A4A → #3A6A2A). Gentle rolling hills via sine displacement. Translates forward in -Z at a constant rate, wrapping back when it exits the camera frustum to create infinite flight feel.
- **Clouds:** 3-5 clusters of merged sphere geometry, white with slight transparency, drifting at different heights and speeds.
- **Lighting:** Ambient + directional. No shadows (performance). Warm sunlight angle (~2pm feel).

### Paper Plane Model

- **Source:** Downloaded from get3dmodels.com ("Simple Paper Plane" by Poly by Google)
- **Format:** GLB (binary glTF)
- **File:** `apps/web/public/models/paper-plane.glb`
- **Size:** 1.44 KB, 4 triangles, 6 vertices
- **License:** CC Attribution — see `apps/web/public/models/ATTRIBUTION.md` for full credit

### Interaction & Physics

All physics use R3F's `useFrame` delta time (seconds), NOT frame-bound values:

- Gravity: constant downward force of -2.0 units/s²
- Click/tap: instantaneous upward velocity impulse of +6.0 units/s
  - Click target: the R3F Canvas element only (not the HUD overlay)
  - HUD overlay has `pointerEvents: 'auto'` so progress bar, messages, and error buttons remain interactive without triggering plane boosts
- Plane rotation: pitch mapped to vertical velocity (clamped ±20°)
  - Climbing (positive velocity) → nose up
  - Descending (negative velocity) → nose down
- Soft bounds: plane confined to camera frustum (can't fly below terrain + 1 unit buffer, or above camera max height)
- Camera: smooth follow with lerp factor 3.0/s, maintains ~8 units behind and ~3 units above plane

### States

| State | Duration | Behavior |
|-------|----------|----------|
| **Entering** | 1.0s | Plane flies in from bottom-center with a gentle swoop. Clicks ignored during this period. Clouds fade in. |
| **Idle/Flying** | indefinite | Gravity pulls down, user clicks to boost. Clouds drift, terrain scrolls. Waits for `completed` prop → **Completed** state. |
| **Error** | indefinite | Triggered by trip-generation failure (parent API error). Scene's last frame freezes visually. Error UI overlays from TakeoffTransition take over, then parent unmounts scene. |
| **Completed** | 2.5s total | 1.0s victory loop (360° banked turn), then 1.5s glide off-screen right (last 0.5s includes fade). Calls `onExit` after fade completes. Parent then unmounts scene. |
| **Exit** | 0.5s | Last 0.5s of Completed glide includes a fade-out. `onExit` fires after fade. Parent sets conditional render to `false`, scene unmounts. |

**Flow:** Entering → Idle/Flying → (completed prop received) → Completed (includes 0.5s fade) → onExit → parent unmounts.

### Error Handling & Fallbacks

Detection of `prefers-reduced-motion` and WebGL support happens proactively in `TakeoffTransition` (the parent), before the dynamic `import()`, to prevent unnecessary bundle download:

```tsx
// Proactive checks before loading 3D bundle
const prefersReducedMotion = usePrefersReducedMotion();  // window.matchMedia
const webglSupported = useWebGLSupported();               // canvas.getContext('webgl')
const show3D = !prefersReducedMotion && webglSupported;
```

| Failure Mode | Behavior |
|--------------|----------|
| **Dynamic import failure** (Three.js/R3F bundle fails to load) | React Error Boundary wraps the `dynamic()` import. Catches failure, renders solid blue background + existing HUD. |
| **GLB model fails to load** (404/network error) | `PaperPlane` component renders a fallback procedural triangle mesh in the same silhouette. Essentially invisible to the user. |
| **WebGL unsupported** (old browser) | Proactive `canvas.getContext('webgl')` check before import. 3D bundle never loads. Solid blue background + HUD. |
| **Reduced motion** (`prefers-reduced-motion`) | Proactive `window.matchMedia('(prefers-reduced-motion: reduce)')` check before import. 3D bundle never loads. Solid blue background + HUD. |

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `apps/web/components/home/TakeoffScene3D/index.tsx` | Main 3D scene compositor, R3F Canvas, error boundary |
| `apps/web/components/home/TakeoffScene3D/PaperPlane.tsx` | GLB model loader, click handler, velocity/gravity physics, procedural fallback mesh |
| `apps/web/components/home/TakeoffScene3D/Terrain.tsx` | Low-poly rolling hills with vertex colors |
| `apps/web/components/home/TakeoffScene3D/Clouds.tsx` | Floating cloud clusters |
| `apps/web/components/home/TakeoffScene3D/Sky.tsx` | Gradient atmosphere + fog |
| `apps/web/components/home/ErrorBoundary.tsx` | React Error Boundary wrapper for dynamic import |
| `apps/web/hooks/usePrefersReducedMotion.ts` | `window.matchMedia` hook for reduced-motion detection |
| `apps/web/hooks/useWebGLSupported.ts` | `canvas.getContext('webgl')` detection hook |
| `apps/web/public/models/paper-plane.glb` | Downloaded paper plane 3D model |
| `apps/web/public/models/ATTRIBUTION.md` | CC Attribution credit for 3D model |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/components/home/TakeoffTransition.tsx` | Replace canvas rendering with dynamic import of TakeoffScene3D. Remove `buttonRect` prop (no longer needed). Remove `buttonRect` caller code in `page.tsx`. Remove `PAPER_PLANE_PATHS`/`PAPER_PLANE_VIEWBOX` shared imports and the 2D Canvas `useEffect`. Keep `PaperPlane` SVG import (still used in HUD logo). Add Error Boundary wrapper. Add `usePrefersReducedMotion()` and `useWebGLSupported()` checks before import. |
| `apps/web/package.json` | Add three, @react-three/fiber, @react-three/drei |

## Performance Considerations

- 3D scene is **only mounted when visible** — React unmounts it when the transition hides
- Low polygon counts everywhere (terrain is coarse, clouds are simple spheres)
- No post-processing, no shadows, no expensive shaders
- Model is 1.44 KB — essentially free
- R3F Canvas uses `dpr={[1, 1.5]}` to cap pixel ratio on high-DPI screens
- Bundle only loads when needed (dynamic import)

## Accessibility

- Click/tap interaction is optional — scene still looks beautiful without interaction
- No critical information conveyed through the 3D scene
- Progress bar and status messages remain accessible
- Reduced motion: `prefers-reduced-motion` media query skips 3D scene entirely, shows solid blue background + HUD

## Acceptance Criteria

### Visual
- [ ] 3D scene replaces the 2D Canvas animation on the takeoff/loading screen
- [ ] Low-poly countryside terrain with rolling green hills and sky gradient is visible
- [ ] 3-5 cloud clusters float at different heights and speeds
- [ ] Paper plane (GLB model) is rendered with proper lighting and rotation

### Interaction
- [ ] Click/tap anywhere on the screen gives the plane an upward boost
- [ ] Gravity continuously pulls the plane down when not clicking
- [ ] Plane pitches up when climbing, pitches down when descending
- [ ] Camera smoothly follows the plane with lerp
- [ ] Plane stays within soft bounds (can't hit terrain or fly off screen)

### States & Transitions
- [ ] Entering: plane swoops in from bottom-center in 1s
- [ ] Idle/Flying: plane responds to clicks indefinitely while trip generates
- [ ] Completed: when `completed` prop is true, plane does 1s victory loop + 1.5s glide off-screen, then calls `onExit`
- [ ] Exit: parent unmounts scene after `onExit`, 0.5s fade

### Error Handling
- [ ] Dynamic import failure shows solid blue background + existing HUD (no crash)
- [ ] GLB 404/network error renders procedural fallback mesh (no crash)
- [ ] WebGL unsupported shows static blue background + HUD (no crash)
- [ ] `prefers-reduced-motion` skips 3D scene entirely, shows solid blue background + HUD

### Bundle
- [ ] 3D dependencies are lazy-loaded, zero impact on initial page load
- [ ] Canvas uses `dpr={[1, 1.5]}` to cap pixel ratio
- [ ] Scene unmounts when takeoff screen is dismissed

## Future Possibilities (out of scope)

- More terrain biomes (desert, snow, tropical)
- Collectible objects (stars, coins) during flight
- High score tracking for flight duration
- Seasonal themes (snow for winter, cherry blossoms for spring)

## Credits

Paper plane 3D model: "Simple Paper Plane" by Poly by Google, CC Attribution.
Downloaded from get3dmodels.com.
Full attribution maintained at `apps/web/public/models/ATTRIBUTION.md`.
