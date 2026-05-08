'use client';

import { use, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Calendar, Users, Clock,
  Train, Bus, Footprints, Navigation,
  CreditCard, ChevronDown,
  Utensils, Camera,
  Phone, ShieldAlert, Ambulance,
} from 'lucide-react';
import { useItineraryScreen } from '@travyl/shared';
import { useQuery } from '@tanstack/react-query';

// ─── Collapsible Section ────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  badge,
  badgeColor,
  bgClass = 'bg-white dark:bg-white/[0.03]',
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  bgClass?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`${bgClass} rounded-xl border border-gray-200 dark:border-white/[0.08] shadow-sm`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.04] transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h5>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Expandable Detail Card ─────────────────────────────────────

function DetailCard({
  icon,
  title,
  subtitle,
  detail,
  themeBg,
  themeHover,
  themeAccent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  detail: string;
  themeBg: string;
  themeHover: string;
  themeAccent: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`w-full ${themeBg} p-3 rounded-lg ${themeHover} transition-all cursor-pointer text-left group`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <p className={`text-sm text-gray-900 dark:text-white group-hover:${themeAccent}`}>{title}</p>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 bg-white/80 dark:bg-white/[0.05] p-2.5 rounded-lg border border-gray-200 dark:border-white/[0.08] leading-relaxed">
              {detail}
            </p>
          </motion.div>
        ) : (
          <p className={`text-xs ${themeAccent} mt-1`}>Click for details</p>
        )}
      </AnimatePresence>
    </button>
  );
}

// ─── Dynamic Data Hooks ──────────────────────────────────────────

function useInfoData(tripId: string) {
  const { trip } = useItineraryScreen(tripId);
  const destination = trip?.destination?.split(',')[0]?.trim() ?? '';
  const country = trip?.destination?.split(',')[1]?.trim() ?? '';
  const exploreItems = trip?.trip_context?.explore_items ?? [];

  // Fetch restaurants from Foursquare
  const lat = (trip?.trip_context?.hotels as any)?.[0]?.lat ?? (trip?.trip_context?.explore_items as any)?.[0]?.lat;
  const lng = (trip?.trip_context?.hotels as any)?.[0]?.lng ?? (trip?.trip_context?.explore_items as any)?.[0]?.lng;

  const { data: restaurants = [] } = useQuery({
    queryKey: ['info-restaurants', destination],
    queryFn: async () => {
      if (!lat || !lng) {
        // Geocode destination
        const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(trip?.destination ?? '')}`);
        if (!geoRes.ok) return [];
        const geo = await geoRes.json();
        if (!geo[0]) return [];
        const res = await fetch(`/api/foursquare?lat=${geo[0].lat}&lng=${geo[0].lon}&category=restaurant&limit=4`);
        return res.ok ? res.json() : [];
      }
      const res = await fetch(`/api/foursquare?lat=${lat}&lng=${lng}&category=restaurant&limit=4`);
      return res.ok ? res.json() : [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!destination,
  });

  // Generate transport info based on destination
  const transportOptions = useMemo(() => [
    { icon: <Train size={16} className="text-purple-600" />, name: 'Public Transit', subtitle: `Metro, bus, and tram systems in ${destination}`, detail: `Use local public transit apps to navigate ${destination}. Purchase day passes at stations for the best value. Most systems run from early morning until midnight.` },
    { icon: <Bus size={16} className="text-purple-600" />, name: 'Buses & Shuttles', subtitle: 'City buses and airport shuttles', detail: `Local buses cover most areas in ${destination}. Airport shuttle services are usually available. Check schedules online or at tourist information centers.` },
    { icon: <Footprints size={16} className="text-purple-600" />, name: 'Walking', subtitle: 'Best way to explore the city center', detail: `Many attractions in ${destination} are walkable. Wear comfortable shoes and carry a water bottle. Use the directions feature in the app for walking routes between spots.` },
    { icon: <Navigation size={16} className="text-purple-600" />, name: 'Ride-hailing', subtitle: 'Uber, Bolt, or local services', detail: `Ride-hailing apps are widely available in ${destination}. Compare prices between services. Official taxis are also available at stands and can be hailed on the street.` },
  ], [destination]);

  // Generate experiences from explore items
  const experiences = useMemo(() =>
    exploreItems.slice(0, 4).map((item: { title: string; category: string; description: string }) => ({
      name: item.title,
      subtitle: item.category,
      detail: item.description || `A must-visit ${item.category.toLowerCase()} in ${destination}. Check opening hours and book in advance when possible.`,
    })),
  [exploreItems, destination]);

  // Emergency numbers — 112 is universal in EU, generate based on country
  const emergencyNumbers = useMemo(() => {
    const base = [{ label: 'International Emergency', number: '112' }];
    const countryNumbers: Record<string, { label: string; number: string }[]> = {
      'France': [{ label: 'Police', number: '17' }, { label: 'Fire', number: '18' }, { label: 'Medical', number: '15' }],
      'Spain': [{ label: 'Police', number: '091' }, { label: 'Fire', number: '080' }, { label: 'Medical', number: '061' }],
      'Italy': [{ label: 'Carabinieri', number: '112' }, { label: 'Police', number: '113' }, { label: 'Medical', number: '118' }],
      'Japan': [{ label: 'Police', number: '110' }, { label: 'Fire/Ambulance', number: '119' }],
      'USA': [{ label: 'All Emergencies', number: '911' }],
      'UK': [{ label: 'All Emergencies', number: '999' }],
      'Australia': [{ label: 'All Emergencies', number: '000' }],
      'Indonesia': [{ label: 'Police', number: '110' }, { label: 'Ambulance', number: '118' }, { label: 'Fire', number: '113' }],
      'Turkey': [{ label: 'Police', number: '155' }, { label: 'Ambulance', number: '112' }, { label: 'Fire', number: '110' }],
      'Thailand': [{ label: 'Tourist Police', number: '1155' }, { label: 'Police', number: '191' }, { label: 'Ambulance', number: '1669' }],
    };
    return [...base, ...(countryNumbers[country] ?? [{ label: 'Local Police', number: 'Ask hotel' }])];
  }, [country]);

  const safetyTips = useMemo(() => [
    `Keep valuables in your hotel safe. Use front pockets in crowded areas of ${destination}.`,
    'Keep a photocopy of your passport separate from the original.',
    'Avoid unlicensed taxis. Use official taxi stands or ride-hailing apps.',
    `Be aware of common tourist scams in ${destination}. Research before your trip.`,
    'Share your itinerary with someone at home. Check in regularly.',
  ], [destination]);

  const restaurantData = useMemo(() =>
    restaurants.map((r: any) => ({
      name: r.name,
      subtitle: r.category ?? 'Restaurant',
      detail: r.tip ?? `Located at ${r.address ?? destination}. ${r.rating ? `Rated ${r.rating}/10.` : ''} Check hours before visiting.`,
    })),
  [restaurants, destination]);

  return { transportOptions, restaurantData, experiences, emergencyNumbers, safetyTips, destination, country };
}

// ─── Page ───────────────────────────────────────────────────────

export default function InfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading, trip: liveTrip } = useItineraryScreen(id);
  const trip = liveTrip;
  const { transportOptions, restaurantData, experiences, emergencyNumbers, safetyTips } = useInfoData(id);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (isLoading || !trip) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-gray-200 dark:bg-white/[0.08] animate-pulse" />
        <div className="h-16 rounded-xl bg-gray-200 dark:bg-white/[0.08] animate-pulse" />
        <div className="h-16 rounded-xl bg-gray-200 dark:bg-white/[0.08] animate-pulse" />
      </div>
    );
  }

  const startDate = new Date(trip.start_date + 'T00:00:00');
  const endDate = new Date(trip.end_date + 'T00:00:00');
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-3">
      {/* Trip Overview Card */}
      <div className="rounded-xl p-5 shadow-lg text-white bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={20} />
              <h4 className="text-lg font-normal font-serif tracking-wide">{trip.destination}</h4>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Calendar size={16} />
              <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm mt-1">
              <Users size={16} />
              <span>
                {trip.travelers} {trip.travelers === 1 ? 'Traveler' : 'Travelers'}
                {' '}&bull;{' '}
                {duration} {duration === 1 ? 'Day' : 'Days'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left Column */}
        <div className="space-y-3">
          {/* Getting Around */}
          <CollapsibleSection
            title="Getting Around"
            icon={<Train size={18} className="text-purple-600" />}
            badge="4 options"
            badgeColor="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
            defaultOpen
          >
            {transportOptions.map((t) => (
              <DetailCard
                key={t.name}
                icon={t.icon}
                title={t.name}
                subtitle={t.subtitle}
                detail={t.detail}
                themeBg="bg-purple-50 dark:bg-purple-500/10"
                themeHover="hover:bg-purple-100 dark:hover:bg-purple-500/20"
                themeAccent="text-purple-600"
              />
            ))}
          </CollapsibleSection>

          {/* Must-Try Restaurants */}
          <CollapsibleSection
            title="Must-Try Restaurants"
            icon={<Utensils size={18} className="text-red-600" />}
            badge="3 spots"
            badgeColor="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
          >
            {restaurantData.map((r: { name: string; subtitle: string; detail: string }) => (
              <DetailCard
                key={r.name}
                icon={<Utensils size={16} className="text-red-600" />}
                title={r.name}
                subtitle={r.subtitle}
                detail={r.detail}
                themeBg="bg-red-50 dark:bg-red-500/10"
                themeHover="hover:bg-red-100 dark:hover:bg-red-500/20"
                themeAccent="text-red-600"
              />
            ))}
          </CollapsibleSection>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Transportation Passes */}
          <CollapsibleSection
            title="Transportation Passes"
            icon={<CreditCard size={18} className="text-blue-600" />}
            badge={`${transportOptions.length} options`}
            badgeColor="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
          >
            {transportOptions.map((p) => (
              <DetailCard
                key={p.name}
                icon={<CreditCard size={16} className="text-blue-600" />}
                title={p.name}
                subtitle={p.subtitle}
                detail={p.detail}
                themeBg="bg-blue-50 dark:bg-blue-500/10"
                themeHover="hover:bg-blue-100 dark:hover:bg-blue-500/20"
                themeAccent="text-blue-600"
              />
            ))}
          </CollapsibleSection>

          {/* Must-Do Experiences */}
          <CollapsibleSection
            title="Must-Do Experiences"
            icon={<Camera size={18} className="text-green-600" />}
            badge={`${experiences.length} experiences`}
            badgeColor="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300"
            defaultOpen
          >
            {experiences.map((e: { name: string; subtitle: string; detail: string }) => (
              <DetailCard
                key={e.name}
                icon={<Camera size={16} className="text-green-600" />}
                title={e.name}
                subtitle={e.subtitle}
                detail={e.detail}
                themeBg="bg-green-50 dark:bg-green-500/10"
                themeHover="hover:bg-green-100 dark:hover:bg-green-500/20"
                themeAccent="text-green-600"
              />
            ))}
          </CollapsibleSection>

          {/* Emergency Information */}
          <CollapsibleSection
            title="Emergency Information"
            icon={<ShieldAlert size={18} className="text-red-700" />}
            badge="112 &bull; 15"
            badgeColor="bg-red-200 dark:bg-red-500/20 text-red-800 dark:text-red-300"
            bgClass="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10"
          >
            {/* Emergency Numbers */}
            <button
              onClick={() => {}}
              className="w-full bg-white dark:bg-white/[0.03] p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-default text-left border border-red-200 dark:border-red-500/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Phone size={16} className="text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Emergency Numbers</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {emergencyNumbers.map((e) => (
                  <a
                    key={e.number}
                    href={`tel:${e.number}`}
                    className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-center"
                  >
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{e.number}</p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">{e.label}</p>
                  </a>
                ))}
              </div>
            </button>

            {/* Hospitals */}
            <button
              onClick={() => {}}
              className="w-full bg-white dark:bg-white/[0.03] p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-default text-left border border-red-200 dark:border-red-500/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Ambulance size={16} className="text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Hospitals & Medical</p>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <p className="font-medium">Hotel-Dieu Hospital</p>
                  <p className="text-gray-500 dark:text-gray-400">1 Place du Parvis Notre-Dame, 75004</p>
                  <a href="tel:+33142348234" className="text-blue-600 dark:text-blue-400 hover:underline">+33 1 42 34 82 34</a>
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <p className="font-medium">American Hospital of Paris</p>
                  <p className="text-gray-500 dark:text-gray-400">63 Blvd Victor Hugo, 92200 Neuilly</p>
                  <a href="tel:+33146412525" className="text-blue-600 dark:text-blue-400 hover:underline">+33 1 46 41 25 25</a>
                </div>
              </div>
            </button>

            {/* Safety Tips */}
            <div className="bg-white dark:bg-white/[0.03] p-3 rounded-lg border border-amber-300 dark:border-amber-500/30">
              <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Important Safety Tips</p>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                {safetyTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500 shrink-0 mt-px">&#x2022;</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
