export interface PlaceCollection {
  key: string;
  label: string;
  match: {
    tags?: string[];
    categories?: string[];
  };
}

/**
 * Ranked priority list of themed place collections.
 * A place matches if ANY of its tags or its category intersects with the match criteria.
 * Collections with fewer than 3 matching places are hidden at render time.
 */
export const PLACE_COLLECTIONS: PlaceCollection[] = [
  {
    key: 'adventure',
    label: 'Adventure & Thrills',
    match: {
      tags: ['Hiking', 'Trekking', 'Bungee', 'Skydiving', 'Diving', 'Extreme', 'Camping', 'Wilderness'],
      categories: ['Adventure', 'Extreme', 'Trekking', 'Water Sports'],
    },
  },
  {
    key: 'history',
    label: 'History & Heritage',
    match: {
      tags: ['History', 'Historic', 'Ancient', 'Archaeology', 'Monument', 'Pyramid', 'Temple', 'Castle'],
      categories: ['Historical', 'Ancient'],
    },
  },
  {
    key: 'nature',
    label: 'Nature & Scenic Views',
    match: {
      tags: ['Nature', 'Mountains', 'Views', 'Sunset', 'Sunrise', 'Canyon', 'Waterfall', 'Glacier', 'Lakes', 'Scenic', 'Scenic Drive'],
      categories: ['Nature'],
    },
  },
  {
    key: 'cultural',
    label: 'Cultural Experiences',
    match: {
      tags: ['Culture', 'Cultural', 'Festival', 'Performing Arts', 'Carnival', 'Samba'],
      categories: ['Cultural', 'Cultural Festival'],
    },
  },
  {
    key: 'architecture',
    label: 'Architecture & Landmarks',
    match: {
      tags: ['Architecture', 'Landmark', 'Castle', 'Church', 'Iconic', 'Wonder', 'Marble'],
      categories: ['Architecture', 'Landmark'],
    },
  },
  {
    key: 'beaches',
    label: 'Beach & Coastal',
    match: {
      tags: ['Beach', 'Coast', 'Island', 'Snorkeling', 'Coral'],
      categories: ['Coastal'],
    },
  },
  {
    key: 'food',
    label: 'Food & Dining',
    match: {
      tags: ['Food', 'Street Food', 'Hawker', 'Market', 'Markets', 'Seafood', 'Cooking', 'Michelin', 'Sushi', 'Omakase', 'Ramen', 'Pizza', 'Tapas', 'Ceviche', 'Brunch'],
      categories: ['Culinary', 'Market', 'Japanese', 'Italian', 'Spanish', 'French', 'Indian', 'Asian', 'Latin American', 'Nordic'],
    },
  },
  {
    key: 'wildlife',
    label: 'Wildlife & Safari',
    match: {
      tags: ['Safari', 'Wildlife', 'Migration', 'Marine Life'],
    },
  },
  {
    key: 'nightlife',
    label: 'Nightlife & Festivals',
    match: {
      tags: ['Nightlife', 'Party', 'Music', 'Night', 'Beer', 'Bar'],
      categories: ['Music Festival', 'Art Festival'],
    },
  },
  {
    key: 'luxury',
    label: 'Luxury Experiences',
    match: {
      tags: ['Luxury', 'Michelin', 'Glamour', 'Wine', 'Vineyard'],
      categories: ['Luxury'],
    },
  },
  {
    key: 'wellness',
    label: 'Wellness & Relaxation',
    match: {
      tags: ['Spa', 'Hot Springs', 'Zen', 'Tea'],
      categories: ['Wellness'],
    },
  },
  {
    key: 'romance',
    label: 'Wedding & Romance',
    match: {
      tags: ['Romance', 'Sunset', 'Fairytale'],
      categories: ['Romantic'],
    },
  },
];

const MIN_COLLECTION_SIZE = 3;

/**
 * Groups places into themed sections based on collection definitions.
 * Returns matched sections (with 3+ places) in priority order, plus uncategorized remainder.
 */
export function groupPlacesByCollection<T extends { tags?: string[]; category: string }>(
  places: T[],
  collections: PlaceCollection[] = PLACE_COLLECTIONS,
  minSize: number = MIN_COLLECTION_SIZE,
): { sections: { collection: PlaceCollection; places: T[] }[]; remaining: T[] } {
  const assigned = new Set<number>();
  const sections: { collection: PlaceCollection; places: T[] }[] = [];

  for (const coll of collections) {
    const matchTags = new Set(coll.match.tags ?? []);
    const matchCats = new Set(coll.match.categories ?? []);

    const matched: T[] = [];
    places.forEach((p, idx) => {
      if (matchCats.has(p.category)) {
        matched.push(p);
        assigned.add(idx);
        return;
      }
      if (p.tags?.some((t) => matchTags.has(t))) {
        matched.push(p);
        assigned.add(idx);
      }
    });

    if (matched.length >= minSize) {
      sections.push({ collection: coll, places: matched });
    }
  }

  const remaining = places.filter((_, idx) => !assigned.has(idx));
  return { sections, remaining };
}
