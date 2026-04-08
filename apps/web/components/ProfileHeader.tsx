import { useState, useRef } from "react";
import { Settings, Camera, Pencil, Check, X, MapPin, User } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@travyl/shared";
import type { Trip } from "@travyl/shared";

interface ProfileHeaderProps {
  trips?: Trip[];
}

export function ProfileHeader({ trips = [] }: ProfileHeaderProps) {
  const { user } = useAuthStore();

  // Calculate stats from actual trips data
  const tripsCount = trips.length;

  // Extract unique cities from trip destinations
  const uniqueCities = new Set<string>();
  trips.forEach(trip => {
    if (trip.destination) {
      uniqueCities.add(trip.destination);
    }
    if (trip.trip_context?.lat && trip.trip_context?.lng) {
      // Could reverse geocode coordinates to city name in the future
      uniqueCities.add(trip.destination || trip.title || 'Unknown');
    }
  });
  const citiesCount = uniqueCities.size || Math.min(tripsCount * 3, tripsCount * 5); // Fallback estimation

  // Calculate XP based on trips and activities
  const calculateXP = () => {
    let xp = 0;
    trips.forEach(trip => {
      // Base XP for each trip
      xp += 50;

      // Additional XP for trip context
      if (trip.trip_context) {
        // XP for explore items
        if (trip.trip_context.explore_items) {
          xp += trip.trip_context.explore_items.length * 10;
        }
      }
    });
    return Math.max(xp, 100); // Minimum 100 XP for signing up
  };

  const currentXP = calculateXP();
  const level = Math.floor(currentXP / 1000) + 1;
  const xpForNextLevel = level * 1000;
  const xpProgress = ((currentXP % 1000) / 1000) * 100;

  // Extract travel interests from explore items
  const extractTravelInterests = () => {
    const interests = new Set<string>();
    trips.forEach(trip => {
      if (trip.trip_context?.explore_items) {
        trip.trip_context.explore_items.forEach(item => {
          if (item.category) {
            interests.add(item.category);
          }
        });
      }
    });

    // Map categories to display tags
    const categoryMap: Record<string, string> = {
      'Restaurant': 'Foodie',
      'Food': 'Foodie',
      'Cafe': 'Foodie',
      'Bar': 'Nightlife',
      'Museum': 'Culture',
      'Historical': 'Culture',
      'Landmark': 'Culture',
      'Beach': 'Beach',
      'Mountain': 'Adventure',
      'Hiking': 'Adventure',
      'Nature': 'Adventure',
      'Shopping': 'Shopping',
      'Nightlife': 'Nightlife',
    };

    const mappedInterests = Array.from(interests)
      .map(cat => categoryMap[cat] || cat)
      .filter(Boolean);

    // Return top 4 unique interests or defaults
    const defaults = ['Beach', 'Adventure', 'Foodie', 'Culture'];
    return mappedInterests.length > 0
      ? [...new Set(mappedInterests)].slice(0, 4)
      : defaults;
  };

  const travelDNA = extractTravelInterests();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [bio, setBio] = useState(
    "Travel enthusiast exploring the world one destination at a time. Beach lover, mountain seeker, festival goer."
  );
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState(bio);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setProfileImage(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startEditingBio = () => {
    setDraftBio(bio);
    setIsEditingBio(true);
  };

  const saveBio = () => {
    setBio(draftBio.trim() || bio);
    setIsEditingBio(false);
  };

  const cancelEditBio = () => {
    setDraftBio(bio);
    setIsEditingBio(false);
  };

  return (
    <div className="bg-[#1e3a5f] pt-24 sm:pt-32 pb-10 sm:pb-14 px-4 sm:px-8 lg:px-12 relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] rounded-full bg-blue-400 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-indigo-400 blur-[120px]" />
        <div className="absolute inset-0" style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
          backgroundSize: '32px 32px' 
        }} />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Settings Link */}
        <div className="flex justify-end mb-4 sm:mb-6">
          <Link href="/profile/settings">
            <button className="flex items-center gap-1.5 text-white/40 hover:text-white/60 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              <Settings size={14} />
              <span style={{ fontSize: "12px", fontWeight: 500 }}>Settings</span>
            </button>
          </Link>
        </div>

        {/* Profile Content */}
        <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-8 lg:gap-12">

          {/* Avatar and Main Info */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 lg:gap-8 flex-1">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] lg:w-[140px] lg:h-[140px] rounded-full border-4 border-white/20 overflow-hidden shadow-2xl transition-all hover:scale-105 duration-300 bg-white/10 flex items-center justify-center cursor-pointer group/avatar relative"
                onClick={() => fileInputRef.current?.click()}
              >
                {profileImage || user?.user_metadata?.avatar_url ? (
                  <img
                    src={profileImage || user?.user_metadata?.avatar_url}
                    alt={user?.user_metadata?.display_name || user?.email || "Profile"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={48} className="text-white/60" />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 rounded-full">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Name, Location & Bio */}
            {/* Name, Location & Bio */}
            <div className="text-center md:text-left">
              <h1
                className="text-white font-bold tracking-tight"
                style={{ fontSize: "clamp(24px, 4vw, 36px)", lineHeight: "1.1" }}
              >
                {user?.user_metadata?.display_name || user?.user_metadata?.name || 'Traveler'}
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <MapPin size={16} className="text-white/70" />
                <p className="text-white/70 text-sm">
                  {user?.user_metadata?.city || 'San Francisco'}{user?.user_metadata?.country ? `, ${user.user_metadata.country}` : ''}
                </p>
              </div>

              {/* Bio */}
              {isEditingBio ? (
                <div className="w-full max-w-[450px] flex flex-col items-center md:items-start gap-3">
                  <textarea
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    autoFocus
                    maxLength={200}
                    rows={3}
                    className="w-full bg-white/10 text-white text-center md:text-left rounded-xl px-4 py-3 outline-none border border-white/20 focus:border-white/40 resize-none placeholder-white/30 backdrop-blur-md"
                    style={{ fontSize: "15px", lineHeight: "1.5" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        saveBio();
                      }
                      if (e.key === "Escape") cancelEditBio();
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveBio}
                      className="px-4 py-1.5 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center gap-1.5 transition-colors shadow-md text-sm font-medium"
                    >
                      <Check size={14} /> Save
                    </button>
                    <button
                      onClick={cancelEditBio}
                      className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors text-sm font-medium"
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group/bio relative max-w-[500px] cursor-pointer bg-white/5 hover:bg-white/10 px-6 py-4 rounded-2xl transition-all border border-white/5 hover:border-white/10 text-center md:text-left" onClick={startEditingBio}>
                  <p
                    className="text-white/80"
                    style={{ fontSize: "16px", lineHeight: "1.6" }}
                  >
                    {bio}
                  </p>
                  <span className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover/bio:opacity-100 transition-opacity bg-white/20 p-2 rounded-full hidden md:block">
                    <Pencil size={14} className="text-white" />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Stats - Level, Trips, Cities, XP */}
          <div className="flex flex-col items-center md:items-end gap-6 lg:gap-8 shrink-0 py-6 md:py-0">
            {/* Level Badge */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl shadow-lg">
                <span className="text-white font-black text-sm uppercase tracking-wider">Level {level}</span>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Status</p>
                <p className="text-white font-bold text-sm">Verified Explorer</p>
              </div>
            </div>

            {/* Trip & City Stats */}
            <div className="flex gap-6 lg:gap-8">
              <div className="text-center md:text-right">
                <p className="text-white font-black text-3xl lg:text-4xl">{tripsCount}</p>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Trips</p>
              </div>
              <div className="w-px bg-white/10"></div>
              <div className="text-center md:text-right">
                <p className="text-white font-black text-3xl lg:text-4xl">{citiesCount}</p>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Cities</p>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="w-full max-w-[280px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Progress</span>
                <span className="text-blue-300 text-[10px] font-black uppercase tracking-widest">{currentXP}/{xpForNextLevel} XP</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${xpProgress}%` }}></div>
              </div>
            </div>

            {/* Travel DNA Tags */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-end max-w-[280px]">
              {travelDNA.map((interest) => {
                const colorMap: Record<string, string> = {
                  'Beach': 'from-cyan-400 to-blue-500',
                  'Adventure': 'from-emerald-400 to-teal-500',
                  'Foodie': 'from-orange-400 to-red-500',
                  'Culture': 'from-purple-400 to-pink-500',
                  'Shopping': 'from-pink-400 to-rose-500',
                  'Nightlife': 'from-indigo-400 to-purple-500',
                };
                const color = colorMap[interest] || 'from-gray-400 to-gray-500';

                return (
                  <div
                    key={interest}
                    className={`px-3 py-1.5 bg-gradient-to-r ${color} rounded-full text-white text-xs font-bold shadow-md`}
                  >
                    {interest}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
