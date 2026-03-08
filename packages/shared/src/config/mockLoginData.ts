import type { } from '../types';

export interface LoginDestination {
  id: number;
  image: string;
  name: string;
  country: string;
  tagline: string;
  highlights: string[];
  bestTime: string;
  vibe: string;
}

export const LOGIN_DESTINATIONS: LoginDestination[] = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1761047726471-7a4c00abb3e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYW50b3JpbmklMjBzdW5zZXQlMjB3aGl0ZSUyMGJ1aWxkaW5ncyUyMGJsdWUlMjBkb21lfGVufDF8fHx8MTc3MjI1NjI3OXww&ixlib=rb-4.1.0&q=80&w=1080",
    name: "Santorini",
    country: "Greece",
    tagline: "Where Heaven Meets Earth",
    highlights: ["Iconic Blue Domes", "Sunset in Oia", "Volcanic Beaches"],
    bestTime: "Apr\u2013Oct",
    vibe: "Romantic \u2022 Luxurious",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1627990493469-95d51823a423?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib3JhJTIwYm9yYSUyMG92ZXJ3YXRlciUyMGJ1bmdhbG93JTIwdHVycXVvaXNlJTIwYWVyaWFsfGVufDF8fHx8MTc3MjMyMzYyN3ww&ixlib=rb-4.1.0&q=80&w=1080",
    name: "Bora Bora",
    country: "French Polynesia",
    tagline: "Paradise Found",
    highlights: ["Overwater Bungalows", "Turquoise Lagoons", "Mount Otemanu"],
    bestTime: "May\u2013Oct",
    vibe: "Tropical \u2022 Exclusive",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1640022578188-063cf5ffe1b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzd2lzcyUyMGFscHMlMjBtb3VudGFpbnMlMjBzbm93JTIwcGVha3N8ZW58MXx8fHwxNzcyMzIzNjI4fDA&ixlib=rb-4.1.0&q=80&w=1080",
    name: "Swiss Alps",
    country: "Switzerland",
    tagline: "Alpine Majesty",
    highlights: ["Matterhorn Peak", "Scenic Railways", "Mountain Villages"],
    bestTime: "Dec\u2013Mar, Jun\u2013Sep",
    vibe: "Adventure \u2022 Pristine",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1764586118640-8d49645d9f96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbWFsZmklMjBjb2FzdCUyMGNvbG9yZnVsJTIwaG91c2VzJTIwY2xpZmZzaWRlfGVufDF8fHx8MTc3MjMyMzYyOHww&ixlib=rb-4.1.0&q=80&w=1080",
    name: "Amalfi Coast",
    country: "Italy",
    tagline: "La Dolce Vita",
    highlights: ["Cliffside Villages", "Limoncello Tours", "Mediterranean Cuisine"],
    bestTime: "Apr\u2013Jun, Sep\u2013Oct",
    vibe: "Cultural \u2022 Scenic",
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1649957866905-bef01af303da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxreW90byUyMGphcGFuJTIwY2hlcnJ5JTIwYmxvc3NvbSUyMHRlbXBsZXxlbnwxfHx8fDE3NzIzMjM2Mjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    name: "Kyoto",
    country: "Japan",
    tagline: "Timeless Traditions",
    highlights: ["Cherry Blossoms", "Bamboo Forest", "Ancient Temples"],
    bestTime: "Mar\u2013May, Oct\u2013Nov",
    vibe: "Peaceful \u2022 Historic",
  },
];
