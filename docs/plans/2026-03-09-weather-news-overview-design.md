# Weather & News on Overview Page — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add weather card and news/events feed to the trip Overview page, rename "Upcoming" to "Things to Check Out".

**Architecture:** Weather card sits below the hero card using existing WeatherInfo/WeatherForecast types and mock data. News items are mixed into the activities list with a new NewsItem type. All mock data is API-swappable.

**Tech Stack:** React, Tailwind v4 CSS variables, @travyl/shared types + mock data, motion/react for animations.

---

## Overview Page Layout (top to bottom)

1. Hero card — existing trip info (no change)
2. Weather card — NEW: current conditions + 5-day forecast strip
3. Two-column grid:
   - Left: "Things to Check Out" (renamed from "Upcoming") — activities + news/events
   - Right: Quick Travel Info — existing Getting Around + Emergency (no change)

## Weather Card

Compact card below hero, themed to trip color:
- Left: current conditions (icon, high/low, description)
- Right: 5-day forecast as horizontal day pills
- Uses existing `MOCK_WEATHER` + `MOCK_WEATHER_FORECAST`
- Later replaced with real weather API

## "Things to Check Out" Section

Mixed feed replacing "Upcoming":
- Activity cards (existing style)
- News/event cards with colored category badge (event/advisory/news/tip)
- Mock data now, real API later

## New Type

```typescript
export interface NewsItem {
  id: string;
  title: string;
  snippet: string;
  category: 'event' | 'advisory' | 'news' | 'tip';
  source: string;
  date: string;
  url?: string;
}
```

## Files to Change

- `packages/shared/src/types/index.ts` — add NewsItem type
- `packages/shared/src/config/mockItineraryData.ts` — add MOCK_NEWS array
- `packages/shared/src/config/index.ts` — export MOCK_NEWS
- `apps/web/app/trip/[id]/page.tsx` — add weather card, news items, rename heading
