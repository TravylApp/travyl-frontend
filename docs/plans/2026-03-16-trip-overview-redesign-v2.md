# Trip Overview Redesign v2

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the trip overview page with dual-theme visual polish, combined content sections, parallax scroll effects, and seamless page transitions.

**Scope:** Trip overview page (`/trip/[id]`) only. No changes to other pages.

---

## 1. Visual Direction

### Light Mode — Warm Editorial

The overview page in light mode should feel like a printed Condé Nast travel magazine.

- **Background**: Warm cream/ivory (`#FAF8F5`) instead of pure white
- **Headings**: Lustria serif font, dark charcoal (`#1a1a1a`)
- **Accents**: Muted gold (`#b8953e`) for section dividers, pill borders, and highlights
- **Cards**: Soft ivory (`#f5f1eb`) with subtle warm borders (`rgba(184,149,62,0.15)`)
- **Text**: Warm gray (`#4a4540`) for body copy, darker for headings
- **Images**: Warm color temperature, soft shadows
- **Section dividers**: Thin gold lines or ornamental flourishes

### Dark Mode — Cinematic Luxury

The overview page in dark mode should feel like an AMAN resorts lookbook.

- **Background**: Deep midnight (`#0c1117`)
- **Headings**: Lustria serif font, soft white (`#e8e4df`)
- **Accents**: Muted warm gold (`#c8a96a`) for highlights and borders
- **Cards**: Dark elevated surface (`#151d28`) with subtle border (`rgba(255,255,255,0.06)`)
- **Text**: Muted ivory (`#b8b0a4`) for body, brighter for headings
- **Images**: Rich contrast, subtle glow/vignette
- **Section dividers**: Faint gold lines with low opacity

### Both Modes — Lustria Headings

- Load Lustria from Google Fonts (serif)
- Apply only to headings within the trip overview page (h1–h4)
- Keep Satoshi for body text and all other pages

---

## 2. Content Layout — Combined Explore + Events

Replace the current two separate carousel sections with a single side-by-side section.

### Structure

```
┌─────────────────────────────────────────────────┐
│  Section Header: "Discover & What's On"         │
├────────────────────────┬────────────────────────┤
│                        │                        │
│   THINGS TO DO         │    EVENTS & NEWS       │
│                        │                        │
│  ┌──────────────────┐  │  ┌──────────────────┐  │
│  │  Card 1 (image)  │  │  │  Event 1         │  │
│  │  Title + desc    │  │  │  Date + category  │  │
│  └──────────────────┘  │  └──────────────────┘  │
│  ┌──────────────────┐  │  ┌──────────────────┐  │
│  │  Card 2 (image)  │  │  │  Event 2         │  │
│  │  Title + desc    │  │  │  Date + category  │  │
│  └──────────────────┘  │  └──────────────────┘  │
│  ┌──────────────────┐  │  ┌──────────────────┐  │
│  │  Card 3 (image)  │  │  │  Event 3         │  │
│  └──────────────────┘  │  └──────────────────┘  │
│                        │                        │
│  Scrollable vertically │  Scrollable vertically │
│  within its box        │  within its box        │
└────────────────────────┴────────────────────────┘
```

### Design Details

- Each half is a self-contained box with its own sub-heading ("Things to Do" / "What's On")
- Both boxes have matching heights, scrollable independently if content overflows
- Explore cards: image-forward with title overlay (keep current card style)
- Event cards: gradient background with category pill, date, and title
- On mobile (<768px): Stack vertically — Things to Do on top, Events below
- Box styling adapts to light/dark theme using CSS variables

---

## 3. Scroll Interaction — Parallax Layers

Replace the current flat scroll with parallax depth effects and reveal animations.

### Implementation

- **Hero cover image**: Scrolls at 0.5x speed (moves slower than content) creating depth
- **Section headings**: Fade in + translate up (20px) as they enter the viewport
- **Cards/content**: Staggered fade-in with slight upward movement, each card delayed by ~100ms
- **Quote divider**: Fade in with a subtle scale effect (0.95 → 1.0)
- **Background elements**: Optional subtle gradient shifts as user scrolls

### Technical Approach

- Use `IntersectionObserver` for triggering reveal animations (no scroll listener overhead)
- CSS `transform: translateY()` with `will-change: transform` for parallax (GPU-accelerated)
- Hero parallax via `onScroll` handler on the page container with `requestAnimationFrame`
- Transitions: `0.6s ease-out` for reveals, stagger via `transition-delay`

### No Snap Scrolling

Normal free scroll — parallax and reveals create the editorial feel without forcing snap behavior.

---

## 4. Page Transition — Fix White Flash

### Root Cause

When navigating from the dark overview to other trip pages, `trip-layout-inner.tsx` switches from `bg-[var(--magazine-bg)]` to `bg-white` instantly while the Framer Motion exit animation is still running. The white background appears before the old content has finished animating out.

### Fix

1. **Delay background transition**: Don't change the background color until the exit animation completes (~250ms). Use a state variable that updates after the animation's `onExitComplete` callback.

2. **Synchronized transition**: In `trip-layout-inner.tsx`, keep the dark background during the exit phase:
   ```
   - Track `isAnimating` state
   - On route change: set isAnimating = true, keep current bg
   - On AnimatePresence onExitComplete: set isAnimating = false, apply new bg
   ```

3. **Smooth fade**: Apply a longer transition (`0.5s`) on the background-color property so even if timing isn't perfect, the change is gradual rather than jarring.

4. **Main layout alignment**: Ensure `app/(main)/layout.tsx` background also uses `transition-colors duration-500` to stay in sync.

---

## 5. CSS Variables — Theme-Aware Overview

Add overview-specific CSS variables that respond to `.dark` class:

```css
:root {
  --overview-bg: #FAF8F5;          /* warm cream */
  --overview-surface: #f5f1eb;     /* card backgrounds */
  --overview-text: #4a4540;        /* body text */
  --overview-heading: #1a1a1a;     /* headings */
  --overview-accent: #b8953e;      /* gold accents */
  --overview-border: rgba(184,149,62,0.15);
}

.dark {
  --overview-bg: #0c1117;
  --overview-surface: #151d28;
  --overview-text: #b8b0a4;
  --overview-heading: #e8e4df;
  --overview-accent: #c8a96a;
  --overview-border: rgba(255,255,255,0.06);
}
```

The overview page uses these variables exclusively, so toggling dark mode updates everything automatically.

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/globals.css` | Add overview CSS variables, Lustria font import |
| `app/(main)/trip/[id]/page.tsx` | Rewrite with new visual design, combined section, parallax, Lustria headings |
| `app/(main)/trip/[id]/trip-layout-inner.tsx` | Fix white flash — delay bg change until exit animation completes |
| `app/(main)/layout.tsx` | Add `transition-colors duration-500` for smooth bg transitions |
| `app/layout.tsx` | Add Lustria Google Font link |

---

## Success Criteria

- [ ] Light mode overview feels like a warm editorial magazine page
- [ ] Dark mode overview feels like a cinematic luxury lookbook
- [ ] Lustria serif on all overview headings, Satoshi everywhere else
- [ ] Things to Do + Events side-by-side in one section, responsive to mobile
- [ ] Parallax depth on hero image, reveal animations on sections
- [ ] No white flash when navigating between overview and other trip pages
- [ ] Dark mode toggle in navbar works seamlessly with overview theming
