'use client'

import { useState, useCallback, useEffect } from "react";
import Navbar from "@/components/navbar";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ProfileTabs } from "@/components/ProfileTabs";
import { FavoriteCard } from "@/components/FavoriteCard";
import { DraggableCard } from "@/components/DraggableCard";
import { NEARBY_PLACES } from "@/components/GlobeData";
import { Heart, Search, X, ArrowUp, LayoutGrid, List, AlignJustify, Plus, Filter, Map as MapIcon, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import dynamic from "next/dynamic";
import { fetchTrips } from "@travyl/shared";
import { supabase } from "@travyl/shared";
import type { Trip } from "@travyl/shared";

const GlobeView = dynamic(() => import("@/components/GlobeView").then(mod => mod.GlobeView), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center">
      <p className="text-gray-400 font-medium">Loading Interactive Map...</p>
    </div>
  )
});

export interface TravelDestination {
  id: string;
  name: string;
  images: string[];
  category: string;
  places: string[];
  highlights: string[];
  duration: string;
  trip?: Trip;
}

const allDestinations: TravelDestination[] = [];
const allCategories: string[] = [];

const CARD_HEIGHTS = ["h-[340px]", "h-[420px]", "h-[300px]", "h-[380px]", "h-[330px]"];

function CardGrid({
  items,
  descriptions,
  favoritedNames,
  toggleFavorite,
  updateDescription,
  forceFavorited,
  onMove,
  viewMode,
  listDensity,
}: {
  items: TravelDestination[];
  descriptions: Record<string, string>;
  favoritedNames: Set<string>;
  toggleFavorite: (name: string) => void;
  updateDescription: (name: string, desc: string) => void;
  forceFavorited?: boolean;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  viewMode: "grid" | "list";
  listDensity: "compact" | "comfortable";
}) {
  if (viewMode === "list") {
    return (
      <div className={listDensity === "compact"
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        : "flex flex-col gap-4"
      }>
        {items.map((dest, index) => (
          <DraggableCard
            key={dest.name}
            id={dest.name}
            index={index}
            onMove={onMove}
            animationDelay={index * 0.03}
          >
            <FavoriteCard
              {...dest}
              description={descriptions[dest.name] || ""}
              isFavorited={forceFavorited ?? favoritedNames.has(dest.name)}
              onToggleFavorite={() => toggleFavorite(dest.name)}
              onUpdateDescription={(desc) => updateDescription(dest.name, desc)}
              variant="list"
              listDensity={listDensity}
              nearbyPlaces={NEARBY_PLACES[dest.name]}
            />
          </DraggableCard>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
    <div className="min-h-screen bg-gray-100 flex flex-col flex-1">
      {/* Profile Header */}
      <div className="bg-[#1e3a5f]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-5 pb-0">
          <div className="flex justify-end mb-2">
            <Link href="/profile/settings" className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/60 transition-colors">
              <Settings size={14} /> Settings
            </Link>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-[88px] h-[88px] rounded-full overflow-hidden border-3 border-white/20 bg-[#2a4d78] flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{initials}</span>
              </div>
              <button className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#3b82f6] border-2 border-[#1e3a5f] flex items-center justify-center cursor-pointer hover:bg-blue-400 transition-colors">
                <Camera size={12} className="text-white" />
              </button>
            </div>

            <h1 className="text-[20px] font-serif font-normal text-white text-center tracking-wide">{displayName}</h1>
            <p className="text-[14px] text-white/50 text-center max-w-[368px] mt-1 leading-relaxed tracking-tight">
              Travel enthusiast exploring the world one destination at a time.
            </p>

            <div className="flex items-center gap-6 mt-4 mb-6">
              {[
                { value: '23', label: 'Countries' },
                { value: '28', label: 'Places' },
                { value: String(PROFILE_FAVORITES.length), label: 'Favorites' },
                { value: String(TRAVEL_BOARDS.length), label: 'Boards' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-[18px] text-white tracking-tight">{stat.value}</p>
                  <p className="text-[10px] text-white/35 tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import { Footer, OceanWave } from "@/components/home";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"boards" | "favorites" | "globe">("boards");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [listDensity, setListDensity] = useState<"compact" | "comfortable">("comfortable");
  const [favoritedNames, setFavoritedNames] = useState<Set<string>>(new Set());
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [boardOrder, setBoardOrder] = useState<string[]>([]);
  const [favOrder, setFavOrder] = useState<string[]>([]);

  // Loading and data states
  const [isLoading, setIsLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get auth state
  const { user, loading: authLoading } = useAuthStore();

  // Fetch trips on mount
  useEffect(() => {
    async function loadTrips() {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // Check if user is authenticated
      if (!user) {
        setError("You must be signed in to view your profile");
        setIsLoading(false);
        return;
      }

      // Check if Supabase is configured
      if (!supabase) {
        setError("Supabase is not configured. Please add your credentials to .env.local");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const fetchedTrips = await fetchTrips();
        setTrips(fetchedTrips);

        // Map trips to destinations format
        const destinations: TravelDestination[] = fetchedTrips.map((trip) => {
          const startDate = new Date(trip.start_date);
          const endDate = new Date(trip.end_date);
          const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: trip.id,
            name: trip.destination || trip.title,
            images: trip.cover_image_url
              ? [trip.cover_image_url]
              : trip.trip_context?.hero_images?.slice(0, 3) || [],
            category: trip.status === 'planning' ? 'Planning' : 'Trip',
            places: trip.trip_context?.explore_items?.slice(0, 4).map(item => item.title) || [],
            highlights: trip.trip_context?.explore_items?.slice(0, 3).map(item => item.title) || [],
            duration: `${days} days`,
            trip,
          };
        });

        // Set initial board order
        setBoardOrder(destinations.map(d => d.id));

        // Auto-favorite first 4 trips as example
        const initialFavorites = new Set(destinations.slice(0, 4).map(d => d.id));
        setFavoritedNames(initialFavorites);
        setFavOrder(destinations.slice(0, 4).map(d => d.id));

      } catch (err) {
        console.error('Error loading trips:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trips');
      } finally {
        setIsLoading(false);
      }
    }

    loadTrips();
  }, [authLoading, user]);

  const toggleFavorite = (name: string) => {
    setFavoritedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        setFavOrder((o) => o.filter((n) => n !== name));
      } else {
        next.add(name);
        setFavOrder((o) => (o.includes(name) ? o : [...o, name]));
      }
      return next;
    });
  };

  const updateDescription = (name: string, desc: string) => {
    setDescriptions((prev) => ({ ...prev, [name]: desc }));
  };

  // Build ordered lists from order arrays
  const destMap = new Map(trips.map((trip) => {
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return [
      trip.id,
      {
        id: trip.id,
        name: trip.destination || trip.title,
        images: trip.cover_image_url
          ? [trip.cover_image_url]
          : trip.trip_context?.hero_images?.slice(0, 3) || [],
        category: trip.status === 'planning' ? 'Planning' : 'Trip',
        places: trip.trip_context?.explore_items?.slice(0, 4).map(item => item.title) || [],
        highlights: trip.trip_context?.explore_items?.slice(0, 3).map(item => item.title) || [],
        duration: `${days} days`,
        trip,
      }
    ];
  }));

  const orderedBoards = boardOrder.map((n) => destMap.get(n)!).filter(Boolean);
  const orderedFavorites = favOrder.filter((n) => favoritedNames.has(n)).map((n) => destMap.get(n)!).filter(Boolean);

  const getFilteredDestinations = (list: TravelDestination[]) => {
    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.places.some((p) => p.toLowerCase().includes(q)) ||
          d.highlights.some((h) => h.toLowerCase().includes(q))
      );
    }
    if (selectedCategory) {
      filtered = filtered.filter((d) => d.category === selectedCategory);
    }
    return filtered;
  };

  const filteredBoards = getFilteredDestinations(orderedBoards);
  const filteredFavorites = getFilteredDestinations(orderedFavorites);

  const currentResults = activeTab === "boards" ? filteredBoards : filteredFavorites;
  const totalForTab = activeTab === "boards" ? trips.length : orderedFavorites.length;
  const isFiltering = !!searchQuery.trim() || !!selectedCategory;

  const handleTabChange = (tab: "boards" | "favorites" | "globe") => {
    setSelectedCategory(null);
    setSearchQuery("");
    setActiveTab(tab);
  };

  const allCategoriesFromTrips = Array.from(new Set(Array.from(destMap.values()).map(d => d.category)));
  const currentCategories = activeTab === "boards"
    ? allCategoriesFromTrips
    : Array.from(new Set(orderedFavorites.map((d) => d.category)));

  // Compute category counts from search-filtered (but not category-filtered) list
  const searchFilteredList = (() => {
    const list = activeTab === "boards" ? orderedBoards : orderedFavorites;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.places.some((p) => p.toLowerCase().includes(q)) ||
        d.highlights.some((h) => h.toLowerCase().includes(q))
    );
  })();

  const categoryCounts: Record<string, number> = {};
  for (const d of searchFilteredList) {
    categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
  }

  // Scroll-to-top
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const moveBoard = useCallback((dragIndex: number, hoverIndex: number) => {
    setBoardOrder((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      return updated;
    });
  }, []);

  const moveFav = useCallback((dragIndex: number, hoverIndex: number) => {
    setFavOrder((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      return updated;
    });
  }, []);

  // Check authentication before showing content
  if (authLoading || isLoading) {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <Loader2 size={48} className="text-[#1e3a5f] animate-spin" />
        </div>
      </DndProvider>
    );
  }

  if (!user && !authLoading) {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e0f2fe] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-2xl p-10">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <User size={40} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">Sign In to View Your Profile</h2>
            <p className="text-gray-600 mb-8">
              You need to be logged in to view your trips, favorites, and profile settings.
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#2a4a6f] transition-all font-bold shadow-lg"
            >
              Sign In
            </a>
          </div>
        </div>
      </DndProvider>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <ProfileHeader />
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          boardsCount={trips.length}
          favoritesCount={orderedFavorites.length}
        />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-12">
          {activeTab !== "globe" && (
            <div className="mb-10 sm:mb-12">
              {/* Toolbar: Search + Actions */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-8">
                <div className="relative flex-1 group">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#1e3a5f]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search through ${activeTab === "boards" ? "travel boards" : "favorites"}...`}
                    className="w-full pl-12 pr-11 py-4 bg-white border border-gray-200 rounded-2xl text-[#314158] placeholder-[#9ca3af] outline-none transition-all focus:border-[#1e3a5f]/40 focus:ring-4 focus:ring-[#1e3a5f]/5 shadow-sm"
                    style={{ fontSize: "15px" }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                      <X size={16} className="text-[#6b7280]" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-3 shrink-0 h-[58px]">
                  <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 h-full bg-[#1e3a5f] text-white rounded-2xl hover:bg-[#2a4a6f] transition-all shadow-md hover:shadow-xl active:scale-95 text-base font-bold">
                    <Plus size={20} />
                    <span>Create {activeTab === "boards" ? "Board" : "Trip"}</span>
                  </button>
                </div>
              </div>

              {/* Filters & View Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-5 border-y border-gray-100 mb-8 bg-white/50 px-6 rounded-2xl">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                  <div className="flex items-center gap-2 mr-3 text-gray-400 shrink-0">
                    <Filter size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Categories</span>
                  </div>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-5 py-2 rounded-xl transition-all whitespace-nowrap text-sm font-bold ${
                      !selectedCategory
                        ? "bg-[#1e3a5f] text-white shadow-lg"
                        : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    All
                  </button>
                  {currentCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`px-5 py-2 rounded-xl transition-all whitespace-nowrap text-sm font-bold ${
                        selectedCategory === cat
                          ? "bg-[#1e3a5f] text-white shadow-lg"
                          : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {cat} <span className="ml-1 opacity-50 font-medium">({categoryCounts[cat] || 0})</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  <div className="h-8 w-px bg-gray-200 hidden md:block" />
                  
                  {/* View toggles */}
                  <div className="flex items-center bg-gray-100/80 rounded-xl p-1.5 shadow-inner">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2.5 rounded-lg transition-all ${
                        viewMode === "grid"
                          ? "bg-white text-[#1e3a5f] shadow-md scale-105"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2.5 rounded-lg transition-all ${
                        viewMode === "list"
                          ? "bg-white text-[#1e3a5f] shadow-md scale-105"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                      title="List View"
                    >
                      <List size={18} />
                    </button>
                  </div>

                  {viewMode === "list" && (
                    <div className="flex items-center bg-gray-100/80 rounded-xl p-1.5 shadow-inner">
                      <button
                        onClick={() => setListDensity("comfortable")}
                        className={`p-2.5 rounded-lg transition-all ${
                          listDensity === "comfortable"
                            ? "bg-white text-[#1e3a5f] shadow-md scale-105"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                        title="Comfortable"
                      >
                        <List size={18} />
                      </button>
                      <button
                        onClick={() => setListDensity("compact")}
                        className={`p-2.5 rounded-lg transition-all ${
                          listDensity === "compact"
                            ? "bg-white text-[#1e3a5f] shadow-md scale-105"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                        title="Compact"
                      >
                        <AlignJustify size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status indicator */}
              <AnimatePresence>
                {isFiltering && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between mb-8"
                  >
                    <div className="flex items-center gap-3 px-4 py-2 bg-[#1e3a5f]/5 text-[#1e3a5f] rounded-xl border border-[#1e3a5f]/10 shadow-sm">
                      <span className="text-sm font-bold">
                        Found {currentResults.length} {currentResults.length === 1 ? 'trip' : 'trips'} 
                        {searchQuery && <span className="text-[#1e3a5f]/60 font-medium italic"> for "{searchQuery}"</span>}
                        {selectedCategory && <span className="text-[#1e3a5f]/60 font-medium italic"> in {selectedCategory}</span>}
                      </span>
                      <button 
                        onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                        className="hover:bg-[#1e3a5f]/10 p-1 rounded-full transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <button 
                      onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                      className="text-sm font-bold text-[#1e3a5f] hover:underline hover:text-[#2a4a6f] transition-all"
                    >
                      Reset all filters
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-40 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-100 shadow-sm px-6">
              <Loader2 size={48} className="text-[#1e3a5f] animate-spin mb-6" />
              <h3 className="text-[#314158] text-2xl font-bold mb-3">Loading Your Trips</h3>
              <p className="text-gray-400 max-w-md mx-auto text-lg">
                Fetching your travel adventures...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-40 text-center bg-white rounded-[32px] border-2 border-dashed border-red-100 shadow-sm px-6">
              <div className="w-28 h-28 bg-red-50 rounded-full flex items-center justify-center mb-10 relative shadow-inner">
                <X size={56} className="text-red-200" />
              </div>
              <h3 className="text-[#314158] text-3xl font-bold mb-4">Unable to Load Trips</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-12 text-lg leading-relaxed">
                {error}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-10 py-4 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-2xl transition-all shadow-xl hover:shadow-2xl font-bold flex items-center gap-3 mx-auto active:scale-95"
              >
                <Loader2 size={20} />
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && trips.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-100 shadow-sm px-6">
              <div className="w-28 h-28 bg-blue-50 rounded-full flex items-center justify-center mb-10 relative shadow-inner">
                <Plus size={56} className="text-blue-200" />
              </div>
              <h3 className="text-[#314158] text-3xl font-bold mb-4">No Trips Yet</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-12 text-lg leading-relaxed">
                Start planning your next adventure! Your trips will appear here once you create them.
              </p>
              <button className="px-10 py-4 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-2xl transition-all shadow-xl hover:shadow-2xl font-bold flex items-center gap-3 mx-auto active:scale-95">
                <Plus size={20} />
                Create Your First Trip
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!isLoading && !error && activeTab === "boards" && (
              <motion.div
                key="boards"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {filteredBoards.length > 0 ? (
                  <CardGrid
                    items={filteredBoards}
                    descriptions={descriptions}
                    favoritedNames={favoritedNames}
                    toggleFavorite={toggleFavorite}
                    updateDescription={updateDescription}
                    onMove={moveBoard}
                    viewMode={viewMode}
                    listDensity={listDensity}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-100 shadow-sm">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                      <Search size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-[#314158] text-2xl font-bold mb-3">No matching boards</h3>
                    <p className="text-gray-400 max-w-sm mx-auto mb-10 text-base">
                      Try adjusting your search or category filters to find the travel boards you're looking for.
                    </p>
                    <button 
                      onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                      className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all font-bold text-base shadow-sm"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {!isLoading && !error && activeTab === "favorites" && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {orderedFavorites.length > 0 ? (
                  <>
                    {filteredFavorites.length > 0 ? (
                      <CardGrid
                        items={filteredFavorites}
                        descriptions={descriptions}
                        favoritedNames={favoritedNames}
                        toggleFavorite={toggleFavorite}
                        updateDescription={updateDescription}
                        forceFavorited
                        onMove={moveFav}
                        viewMode={viewMode}
                        listDensity={listDensity}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-100 shadow-sm">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
                          <Search size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-[#314158] text-2xl font-bold mb-3">No favorites found</h3>
                        <p className="text-gray-400 max-w-sm mx-auto mb-10 text-base">
                          Your search or filter criteria didn't match any of your favorited destinations.
                        </p>
                        <button 
                          onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                          className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all font-bold text-base shadow-sm"
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-40 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-100 shadow-sm px-6">
                    <div className="w-28 h-28 bg-red-50 rounded-full flex items-center justify-center mb-10 relative shadow-inner">
                      <Heart size={56} className="text-red-200 fill-red-50" />
                      <Plus size={24} className="absolute bottom-3 right-3 bg-red-500 text-white rounded-full p-0.5 border-4 border-white shadow-md" />
                    </div>
                    <h3 className="text-[#314158] text-3xl font-bold mb-4">Your heart is empty</h3>
                    <p className="text-gray-400 max-w-md mx-auto mb-12 text-lg leading-relaxed">
                      Every great adventure starts with a single wish. Start exploring and heart the places that inspire you!
                    </p>
                    <button className="px-10 py-4 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white rounded-2xl transition-all shadow-xl hover:shadow-2xl font-bold flex items-center gap-3 mx-auto active:scale-95">
                      <Search size={20} />
                      Discover Destinations
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {!isLoading && !error && activeTab === "globe" && (
              <motion.div
                key="globe"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative"
              >
                <GlobeView
                  destinations={Array.from(destMap.values())}
                  descriptions={descriptions}
                  favoritedNames={favoritedNames}
                  toggleFavorite={toggleFavorite}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scroll-to-top button */}
          <AnimatePresence>
            {showScrollTop && (
              <motion.button
                key="scroll-top"
                onClick={scrollToTop}
                className="fixed bottom-10 right-10 bg-[#1e3a5f] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(30,58,95,0.5)] hover:bg-[#2a4a6f] hover:scale-110 transition-all z-50 group border-2 border-white/20"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 20 }}
              >
                <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        
        <OceanWave />
        <Footer />
      </div>
    </DndProvider>
  );
}
