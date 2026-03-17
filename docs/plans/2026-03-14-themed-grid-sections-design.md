# Themed Grid Sections — Places Page

## Goal

Reorganize the flat masonry grid on the mobile Places page into themed sections with heading labels (e.g. "Beach Getaways", "Wedding Venues") so users can discover places by trip-planning themes.

## Architecture

### Collection Definitions (shared config)

A ranked priority list of theme definitions stored in `@travyl/shared`. Each theme has:

- `key`: unique identifier
- `label`: display heading (e.g. "Beach Getaways")
- `match`: object with `tags` and/or `categories` arrays — a place matches if it has ANY matching tag or category

```ts
export const PLACE_COLLECTIONS = [
  { key: 'beaches', label: 'Beach Getaways', match: { tags: ['Beach', 'Coast', 'Island', 'Coastal'], categories: ['Coastal'] } },
  { key: 'romance', label: 'Wedding & Romance', match: { tags: ['Romance'], categories: ['Romantic'] } },
  { key: 'adventure', label: 'Adventure & Thrills', match: { tags: ['Hiking', 'Trekking', 'Bungee', 'Skydiving', 'Extreme', 'Diving'], categories: ['Adventure', 'Extreme', 'Trekking'] } },
  { key: 'food', label: 'Street Food & Dining', match: { tags: ['Street Food', 'Food', 'Hawker', 'Market'], categories: ['Culinary'] } },
  { key: 'wildlife', label: 'Wildlife & Safari', match: { tags: ['Safari', 'Wildlife', 'Migration', 'Marine Life'] } },
  { key: 'wellness', label: 'Wellness & Relaxation', match: { tags: ['Spa', 'Hot Springs'], categories: ['Wellness'] } },
  { key: 'history', label: 'History & Heritage', match: { tags: ['Historic', 'History', 'Ancient', 'Archaeology', 'Monument'], categories: ['Historical', 'Ancient'] } },
  { key: 'nightlife', label: 'Nightlife & Entertainment', match: { tags: ['Nightlife', 'Party', 'Music', 'Festival'], categories: ['Music Festival', 'Cultural Festival'] } },
  { key: 'nature', label: 'Nature & Scenic Views', match: { tags: ['Nature', 'Mountains', 'Waterfall', 'Canyon', 'Glacier', 'Scenic', 'Views', 'Sunset', 'Sunrise'], categories: ['Nature'] } },
  { key: 'luxury', label: 'Luxury Experiences', match: { tags: ['Luxury', 'Michelin', 'Glamour'], categories: ['Luxury'] } },
];
```

### Matching Logic

- A place matches a collection if any of its `tags` or `category` intersects with the collection's `match.tags` or `match.categories`.
- A place can appear in multiple sections.
- Only collections with 3+ matching places are rendered.
- Places that don't match any collection go into a "More Places" section at the bottom.

### Interaction with Existing Filters

- Tab filter, subcategory filter, search, and sort all apply first.
- Collections are derived from the already-filtered set.
- If filtering narrows a collection below 3 places, that collection is hidden.

### UI

- Static text heading for each section, styled consistently with existing page typography.
- Subtle top divider line before each heading.
- Each section renders its places in the same 2-column masonry grid layout already used.
- Sections appear in priority order (as defined in the config array).
- Only applies to grid view mode. Stack view remains unchanged.

### Scope

- Mobile Places page only (for now).
- No collapsible/expandable behavior.
- No horizontal scroll rows — same masonry grid per section.
- No emoji in headings.
