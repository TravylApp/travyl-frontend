// Shared data for GlobeView and other components to avoid Leaflet SSR issues

export interface NearbyPlace {
  name: string;
  type: "restaurant" | "cafe" | "bar" | "landmark" | "market" | "museum";
  coords: [number, number];
  note: string;
}

export const NEARBY_PLACE_ICONS: Record<NearbyPlace["type"], { emoji: string; color: string }> = {
  restaurant: { emoji: "🍽️", color: "#ef4444" },
  cafe: { emoji: "☕", color: "#f59e0b" },
  bar: { emoji: "🍸", color: "#a855f7" },
  landmark: { emoji: "🏛️", color: "#3b82f6" },
  market: { emoji: "🛍️", color: "#10b981" },
  museum: { emoji: "🎨", color: "#ec4899" },
};

export const NEARBY_PLACES: Record<string, NearbyPlace[]> = {
  "Paris, France": [
    { name: "Le Comptoir du Panthéon", type: "restaurant", coords: [48.8462, 2.3464], note: "Classic French brasserie with amazing duck confit" },
    { name: "Café de Flore", type: "cafe", coords: [48.8540, 2.3325], note: "Iconic literary café — best hot chocolate in Paris" },
    { name: "Le Bouillon Chartier", type: "restaurant", coords: [48.8747, 2.3454], note: "Historic workers' restaurant with incredible prices" },
    { name: "Shakespeare and Company Café", type: "cafe", coords: [48.8526, 2.3471], note: "Cozy spot next to the legendary bookshop" },
    { name: "Le Marais Market", type: "market", coords: [48.8566, 2.3621], note: "Sunday morning market with fresh crêpes" },
    { name: "Musée d'Orsay", type: "museum", coords: [48.8600, 2.3266], note: "Impressionist masterpieces in a former train station" },
  ],
  "Santorini, Greece": [
    { name: "Ammoudi Fish Tavern", type: "restaurant", coords: [36.4618, 25.3726], note: "Freshest grilled octopus right by the water" },
    { name: "Pelican Kipos", type: "cafe", coords: [36.4165, 25.4315], note: "Sunset views with Greek coffee" },
    { name: "Metaxy Mas", type: "restaurant", coords: [36.3585, 25.4710], note: "Best hidden gem — traditional Santorinian dishes" },
    { name: "Oia Castle Viewpoint", type: "landmark", coords: [36.4615, 25.3755], note: "The famous sunset spot — arrive early!" },
    { name: "Santo Wines Winery", type: "bar", coords: [36.4058, 25.4293], note: "Wine tasting with caldera views" },
  ],
  "Tokyo, Japan": [
    { name: "Ichiran Ramen Shibuya", type: "restaurant", coords: [35.6595, 139.7005], note: "Solo booth ramen experience — tonkotsu perfection" },
    { name: "Tsukiji Outer Market", type: "market", coords: [35.6654, 139.7707], note: "Fresh sushi and tamagoyaki for breakfast" },
    { name: "Café Kitsune", type: "cafe", coords: [35.6735, 139.7099], note: "Matcha latte in a serene Omotesando setting" },
    { name: "Golden Gai", type: "bar", coords: [35.6938, 139.7038], note: "Tiny themed bars in Shinjuku — unforgettable vibes" },
    { name: "teamLab Borderless", type: "museum", coords: [35.6268, 139.7839], note: "Immersive digital art that moves with you" },
    { name: "Senso-ji Temple", type: "landmark", coords: [35.7148, 139.7967], note: "Tokyo's oldest temple — stunning at night" },
  ],
  "Bali, Indonesia": [
    { name: "Locavore", type: "restaurant", coords: [-8.5030, 115.2625], note: "World-class Indonesian tasting menu in Ubud" },
    { name: "Revolver Espresso", type: "cafe", coords: [-8.6865, 115.1688], note: "Hidden laneway café with the best coffee in Seminyak" },
    { name: "La Favela", type: "bar", coords: [-8.6845, 115.1647], note: "Eclectic jungle bar with great cocktails" },
    { name: "Ubud Art Market", type: "market", coords: [-8.5070, 115.2630], note: "Handcrafted souvenirs and Balinese textiles" },
    { name: "Tirta Empul Temple", type: "landmark", coords: [-8.4152, 115.3155], note: "Sacred water temple — bring a sarong" },
  ],
  "Amalfi Coast, Italy": [
    { name: "Da Vincenzo", type: "restaurant", coords: [40.6333, 14.4850], note: "Family-run spot with the best lemon pasta" },
    { name: "Bar Bruno", type: "cafe", coords: [40.6313, 14.6027], note: "Morning espresso watching the boats come in" },
    { name: "Trattoria da Gemma", type: "restaurant", coords: [40.6340, 14.6020], note: "Classic Amalfitano cuisine since 1872" },
    { name: "Path of the Gods", type: "landmark", coords: [40.6235, 14.5245], note: "Breathtaking coastal hike — bring water!" },
    { name: "Limoncello di Capri Shop", type: "market", coords: [40.6330, 14.6035], note: "Free limoncello tastings on every corner" },
  ],
};

// Coordinates for each destination
export const DESTINATION_COORDS: Record<string, [number, number]> = {
  "Santorini, Greece": [36.3932, 25.4615],
  "Paris, France": [48.8566, 2.3522],
  Maldives: [3.2028, 73.2207],
  "Swiss Alps": [46.8182, 8.2275],
  "Bali, Indonesia": [-8.3405, 115.092],
  "Machu Picchu, Peru": [-13.1631, -72.545],
  "Northern Lights, Norway": [69.6496, 18.956],
  "Yosemite, USA": [37.8651, -119.5383],
  "Tokyo, Japan": [35.6762, 139.6503],
  "Dubai, UAE": [25.2048, 55.2708],
  "Amsterdam, Netherlands": [52.3676, 4.9041],
  "Cape Town, South Africa": [-33.9249, 18.4241],
  "Petra, Jordan": [30.3285, 35.4444],
  "New York City, USA": [40.7128, -74.006],
  "Marrakech, Morocco": [31.6295, -7.9811],
  "Patagonia, Argentina": [-49.3, -73.2],
  "Amalfi Coast, Italy": [40.6333, 14.6029],
  "Havana, Cuba": [23.1136, -82.3666],
  "Prague, Czech Republic": [50.0755, 14.4378],
};

// Category accent colors (matching FavoriteCard)
export const CATEGORY_COLORS: Record<string, string> = {
  Beach: "#0ea5e9",
  Mountain: "#22c55e",
  City: "#a855f7",
  Cultural: "#f59e0b",
  Adventure: "#ef4444",
  Island: "#06b6d4",
  Desert: "#f97316",
  Arctic: "#6366f1",
  Wellness: "#ec4899",
  Countryside: "#84cc16",
  Nature: "#10b981",
  Culture: "#f59e0b",
  History: "#b45309",
  Coastal: "#0284c7",
};

export const getCategoryColor = (category: string) =>
  CATEGORY_COLORS[category] || "#64748b";
