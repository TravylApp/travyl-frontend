# Trip Overview — Editorial Magazine Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the trip overview from a dashboard into a scrolling editorial magazine article that tells the story of the trip.

**Architecture:** Single-page editorial layout within the existing trip layout container. Lustria serif for headers/numerals, Satoshi sans-serif for body. Gradient placeholder images with Lucide icon watermarks as visual section breaks.

**Tech Stack:** Next.js, React, Tailwind CSS v4, Lucide icons, Motion (framer-motion), existing shared package hooks/data

---

## Typography

- **Lustria** (Google Font, serif) — all section headers, large numerals, destination name
- **Satoshi** (existing) — body text, labels, UI elements
- Font loaded via `next/font/google` or `@import`

## Section Flow

### 1. Hero
- Full-width gradient using `--trip-base` → `--trip-base-light`
- Destination name in Lustria ~48-60px
- Trip meta subtitle in Satoshi: "6 days · 2 travelers · Mar 10–16, 2026"
- Faint MapPin icon watermark at low opacity

### 2. By the Numbers (Pull Quote)
- Centered stat block on light beige background
- Large Lustria numerals with small uppercase Satoshi labels
- Flights | Hotels | Activities
- Gold hairline rules above and below

### 3. "Arriving in {destination}" — Flights
- Lustria header with thin gold accent line
- Flight cards as narrative blocks: large departure/arrival cities, airline in small caps
- Subtle Plane icon between cities
- Empty state: italic placeholder text
- Gradient section-break strip after (Plane icon watermark)

### 4. "Your Home in {destination}" — Hotels
- Lustria header, gold accent
- Hotel as editorial feature card with gradient placeholder image + Building2 watermark
- Hotel name in Lustria, details in Satoshi body
- Empty state: italic placeholder text

### 5. "The Forecast" — Weather
- Lustria header
- Current temp in large Lustria numerals, conditions in Satoshi
- 5-day forecast row with Lucide weather icons (Sun, Cloud, Droplets, CloudSun — no emojis)
- Subtle sky gradient background (`from-sky-50 to-blue-50`)

### 6. "What Awaits You" — News & Events
- Lustria header
- Each item as mini-article: colored dot + uppercase category label, bold title, body snippet, italic byline source
- Hairline rule separators (no card borders)
- External link icon subtle
- Gradient section-break strip after (Sparkles watermark)

### 7. "Navigating {destination}" — Transport
- Lustria header
- 2x2 grid on desktop, stacked on mobile
- Transport icon, bold name, description, detail text always visible (no collapsible)
- Clean white backgrounds with soft borders

### 8. "Know Before You Go" — Emergency & Safety
- Lustria header
- Emergency numbers: large Lustria numerals, small Satoshi labels, red left-border accent
- Safety tips as clean editorial paragraphs with inline Shield icon

## Constraints

- Stays within existing trip layout content area (next to sidebar tabs)
- All current data preserved — nothing removed
- Dynamic headers using destination name from trip data
- No collapsible sections — everything reads openly
- Scrolling is fine
- No emoji anywhere — Lucide icons only
