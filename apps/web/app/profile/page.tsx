'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Settings, Camera, LayoutGrid, Globe2, Heart, MapPin, Search, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
const ResponsiveMasonry = dynamic(
  () => import('react-responsive-masonry').then((m) => m.ResponsiveMasonry),
  { ssr: false },
);
const Masonry = dynamic(
  () => import('react-responsive-masonry').then((m) => m.default),
  { ssr: false },
);
import {
  useAuthStore, useProfile,
  PROFILE_FAVORITES, LOCATION_COORDS, BOARD_FILTER_TAGS, CATEGORY_TAGS, TRAVEL_BOARDS,
} from '@travyl/shared';
import type { GlobeLocation, DiscoverItem, FavoriteItem, PostcardData } from '@travyl/shared';
import TravelBoards from '@/components/TravelBoards';
import { EventCard } from '@/components/EventCard';
import { PostcardDetail } from '@/components/PostcardDetail';
import { ItineraryPinCard } from '@/components/itinerary/ItineraryPinCard';
import { Footer, OceanWave } from '@/components/home';

const CorkBoardMap = dynamic(() => import('@/components/CorkBoardMap').then((m) => m.CorkBoardMap), { ssr: false });

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  const { data: profile } = useProfile();

  // Allow unauthenticated preview with mock data
  const isAuthenticated = !!user;
  const displayName = isAuthenticated
    ? (profile?.display_name ?? user.email?.split('@')[0] ?? 'User')
    : 'Alex Rivera';
  const initials = displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <ProfileContent displayName={displayName} initials={initials} onSignOut={isAuthenticated ? signOut : () => {}} />;
}

function ProfileContent({
  displayName,
  initials,
  onSignOut,
}: {
  displayName: string;
  initials: string;
  onSignOut: () => void;
}) {
  const [profileTab, setProfileTab] = useState<'boards' | 'favorites'>('boards');
  const [favoritesView, setFavoritesView] = useState<'boards' | 'globe'>('boards');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [favFilter, setFavFilter] = useState('All');
  const [favBoardFilter, setFavBoardFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [postcardData, setPostcardData] = useState<PostcardData | null>(null);

  const filteredFavorites = useMemo(() => {
    let items = [...PROFILE_FAVORITES];
    if (favFilter === 'Places') items = items.filter((f) => f.type === 'place');
    else if (favFilter === 'Events') items = items.filter((f) => f.type === 'event');
    if (favBoardFilter !== 'All') {
      const isBoardName = BOARD_FILTER_TAGS.includes(favBoardFilter);
      if (isBoardName) {
        items = items.filter((f) => f.board === favBoardFilter);
      } else {
        items = items.filter((f) => f.tags.some((t) => t.toLowerCase() === favBoardFilter.toLowerCase()));
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((f) => f.name.toLowerCase().includes(q) || f.country.toLowerCase().includes(q) || f.tags.some((t) => t.toLowerCase().includes(q)));
    }
    return items;
  }, [favFilter, favBoardFilter, searchQuery]);

  const favoritesAsDiscoverItems: DiscoverItem[] = useMemo(() => {
    return filteredFavorites.map((fav) => ({
      id: fav.id,
      name: fav.name,
      location: fav.country,
      description: fav.description,
      images: [fav.image],
      rating: fav.rating,
      tags: fav.tags,
      category: fav.category,
    }));
  }, [filteredFavorites]);

  const globeLocations: GlobeLocation[] = useMemo(() => {
    return filteredFavorites
      .filter((fav) => LOCATION_COORDS[fav.id])
      .map((fav) => {
        const coords = LOCATION_COORDS[fav.id];
        return {
          id: fav.id,
          name: fav.name,
          location: fav.country,
          lat: coords.lat,
          lng: coords.lng,
          type: fav.type,
          category: fav.category,
          color: coords.color,
          board: fav.board,
          rating: fav.rating,
          date: fav.date,
          imageUrl: fav.image,
        };
      });
  }, [filteredFavorites]);

  const openPostcard = (fav: FavoriteItem) => {
    const coords = LOCATION_COORDS[fav.id];
    setPostcardData({
      id: fav.id,
      name: fav.name,
      location: fav.country,
      imageUrl: fav.image,
      category: fav.category,
      type: fav.type,
      rating: fav.rating,
      date: fav.date,
      board: fav.board,
      color: coords?.color ?? '#3b82f6',
      description: fav.description,
      tags: fav.tags,
    });
  };

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

            <h1 className="text-[20px] text-white tracking-tight text-center">{displayName}</h1>
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
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-100 pt-5">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 mb-4">
          <div className="flex items-center gap-0 border-b border-gray-200">
            <button
              onClick={() => setProfileTab('boards')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] border-b-2 transition-all cursor-pointer ${profileTab === 'boards' ? 'border-[#1e3a5f] text-[#1e3a5f] font-semibold' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Travel Boards
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${profileTab === 'boards' ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]' : 'bg-gray-200 text-gray-400'}`}>
                {TRAVEL_BOARDS.length}
              </span>
            </button>
            <button
              onClick={() => { setProfileTab('favorites'); setFavoritesView('boards'); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] border-b-2 transition-all cursor-pointer ${profileTab === 'favorites' ? 'border-[#1e3a5f] text-[#1e3a5f] font-semibold' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              <Heart size={12} className={profileTab === 'favorites' ? 'text-[#1e3a5f]' : 'text-gray-400'} />
              Favorites
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${profileTab === 'favorites' ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]' : 'bg-gray-200 text-gray-400'}`}>
                {PROFILE_FAVORITES.length}
              </span>
            </button>

            <div className="ml-auto bg-white rounded-full border border-gray-200 flex p-0.5 overflow-hidden shrink-0 mb-[-1px]">
              <button
                onClick={() => { setProfileTab('boards'); setFavoritesView('boards'); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] transition-colors cursor-pointer ${profileTab === 'boards' ? 'bg-[#1e3a5f] text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid size={12} /> Boards
              </button>
              <button
                onClick={() => { setProfileTab('favorites'); setFavoritesView('globe'); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] transition-colors cursor-pointer ${profileTab === 'favorites' && favoritesView === 'globe' ? 'bg-[#1e3a5f] text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Globe2 size={12} /> Globe
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {profileTab === 'boards' ? (
            <motion.div
              key="boards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto px-4 sm:px-8 py-4"
            >
              <TravelBoards />
            </motion.div>
          ) : (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto px-4 sm:px-8 py-4"
            >
              {/* Favorites Toolbar */}
              <div className="mb-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
                  <div className="flex items-center gap-1 shrink-0">
                    {(['All', 'Places', 'Events'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setFavFilter(type)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] cursor-pointer transition-colors ${favFilter === type ? 'bg-[#1e3a5f] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {type === 'All' && <Heart size={14} />}
                        {type === 'Places' && <MapPin size={14} />}
                        {type === 'Events' && <CalendarDays size={14} />}
                        {type}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search favorites..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-24 py-2.5 rounded-full border border-gray-200 bg-white text-[14px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/30"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">
                      {filteredFavorites.length} results
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {BOARD_FILTER_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setFavBoardFilter(tag)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] transition-colors cursor-pointer border whitespace-nowrap ${favBoardFilter === tag ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                    >
                      {tag}
                    </button>
                  ))}
                  <span className="w-px h-4 bg-gray-200 mx-1 shrink-0" />
                  {CATEGORY_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setFavBoardFilter(favBoardFilter === tag ? 'All' : tag)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] transition-colors cursor-pointer border whitespace-nowrap ${favBoardFilter === tag ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Favorites Content */}
              {favoritesView === 'globe' ? (
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="w-full lg:w-[240px] shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[14px] text-[#1e3a5f]">All Favorites</span>
                      <span className="text-[12px] text-gray-400">{filteredFavorites.length} items</span>
                    </div>
                    <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible lg:max-h-[600px] lg:overflow-y-auto pb-2 lg:pr-2">
                      {globeLocations.map((loc) => (
                        <div key={loc.id} className="min-w-[200px] lg:min-w-0">
                          <EventCard
                            event={loc}
                            compact
                            isSelected={selectedLocationId === loc.id}
                            onSelect={(id) => setSelectedLocationId(selectedLocationId === id ? null : id)}
                            onViewDetail={(id) => {
                              const fav = filteredFavorites.find((f) => f.id === id);
                              if (fav) openPostcard(fav);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-gray-400">Cork Board Map</span>
                      <span className="text-[11px] text-gray-300 italic">3D Globe coming soon</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <CorkBoardMap
                        locations={globeLocations}
                        selectedLocationId={selectedLocationId}
                        onSelectLocation={setSelectedLocationId}
                        height="580px"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[14px] text-[#1e3a5f]">All Favorites</span>
                    <span className="text-[12px] text-gray-400">{filteredFavorites.length} items found</span>
                  </div>
                  <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 640: 2, 900: 3, 1200: 4 }}>
                    <Masonry gutter="16px">
                      {favoritesAsDiscoverItems.map((item, i) => (
                        <div
                          key={item.id}
                          className="cursor-pointer"
                          onClick={() => {
                            const fav = filteredFavorites.find((f) => f.id === item.id);
                            if (fav) openPostcard(fav);
                          }}
                        >
                          <ItineraryPinCard
                            item={item}
                            index={i}
                            accentColor="#1e3a5f"
                            isFavorited
                            onFavorite={() => {}}
                          />
                        </div>
                      ))}
                    </Masonry>
                  </ResponsiveMasonry>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign Out */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
        <button
          onClick={onSignOut}
          className="flex h-11 w-full max-w-xs items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors hover:bg-red-100 text-sm"
        >
          Sign Out
        </button>
      </div>

      {/* Postcard Detail Modal */}
      <PostcardDetail data={postcardData} onClose={() => setPostcardData(null)} />
    </div>
      <OceanWave />
      <Footer />
    </div>
  );
}
