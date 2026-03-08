'use client';

import { use, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Calendar, Users, Clock,
  Train, Bus, Footprints, Navigation,
  CreditCard, ChevronDown,
  Utensils, Camera,
  Phone, ShieldAlert, Ambulance,
} from 'lucide-react';
import { useItineraryScreen, MOCK_TRIP } from '@travyl/shared';

// ─── Collapsible Section ────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  badge,
  badgeColor,
  bgClass = 'bg-white',
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
    <div className={`${bgClass} rounded-xl shadow-md`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h5 className="text-sm font-semibold text-gray-900">{title}</h5>
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
        <p className={`text-sm text-gray-900 group-hover:${themeAccent}`}>{title}</p>
      </div>
      <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-gray-700 mt-2 bg-white/80 p-2.5 rounded-lg border border-gray-200 leading-relaxed">
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

// ─── Data ───────────────────────────────────────────────────────

const TRANSPORT_OPTIONS = [
  {
    icon: <Train size={16} className="text-purple-600" />,
    name: 'Metro',
    subtitle: '3 lines, stations every 500m',
    detail:
      'The Paris Metro is the fastest way to get around. Line 1, 4, and 7 serve major tourist areas. Buy a carnet of 10 tickets for savings. The RER suburban trains connect to airports and Versailles. Runs 5:30 AM - 1:15 AM.',
  },
  {
    icon: <Bus size={16} className="text-purple-600" />,
    name: 'Buses & Tram',
    subtitle: 'Scenic routes, night buses after metro closes',
    detail:
      'Buses are slower but offer great views. The 69 bus route passes many landmarks. Noctilien night buses run 12:30 AM - 5:30 AM on major routes. Same ticket as metro.',
  },
  {
    icon: <Footprints size={16} className="text-purple-600" />,
    name: 'Walking',
    subtitle: 'Most attractions within 30 min walk',
    detail:
      'Walking is the best way to discover Paris. The banks of the Seine, Le Marais, and Montmartre are especially pleasant on foot. Wear comfortable shoes on cobblestones!',
  },
  {
    icon: <Navigation size={16} className="text-purple-600" />,
    name: 'Taxis',
    subtitle: 'Widely available, expect 15-40 EUR',
    detail:
      'Official taxis are beige/cream colored. Uber and Bolt operate in Paris. From CDG airport: expect 50-70 EUR flat rate. Tipping is not required but appreciated (5-10%).',
  },
];

const RESTAURANTS = [
  {
    name: 'Le Comptoir du Pantheon',
    subtitle: 'Classic French Bistro',
    detail:
      'Traditional zinc-bar bistro near the Pantheon. Must-try: duck confit and creme brulee. Reservations recommended for dinner. Moderate pricing.',
  },
  {
    name: 'Breizh Cafe',
    subtitle: 'Le Marais, Crepes & Galettes',
    detail:
      'Organic Brittany-style creperie in Le Marais. Try the "Complete" galette (ham, cheese, egg). Artisanal cider available. Budget-friendly.',
  },
  {
    name: 'Le Bouillon Chartier',
    subtitle: 'Traditional French, Budget',
    detail:
      'Historic canteen since 1896. Incredible value 3-course meals in a stunning Belle Epoque dining room. No reservations - expect a short queue.',
  },
];

const TRANSPORT_PASSES = [
  {
    name: 'Navigo Easy',
    subtitle: '2 EUR/ride, rechargeable metro/bus card',
    detail:
      'Available at any metro station. Load individual tickets (t+ tickets at 2.10 EUR) or 10-packs. Works on metro, bus, and tram within Paris.',
  },
  {
    name: 'Navigo Week',
    subtitle: '30 EUR/week, unlimited zones 1-5 (Mon-Sun)',
    detail:
      'Best value if staying 5+ days. Covers metro, bus, RER, and tram in ALL zones including airports. Requires a passport photo. Runs Monday to Sunday only.',
  },
  {
    name: 'Paris Visite Pass',
    subtitle: '13.95 EUR/day, tourist pass with discounts',
    detail:
      'Available for 1, 2, 3, or 5 days. Includes unlimited public transport plus discounts at Arc de Triomphe, Montparnasse Tower, and more. Available for zones 1-3 or 1-5.',
  },
];

const EXPERIENCES = [
  {
    name: 'Eiffel Tower Summit',
    subtitle: 'Landmark, best at sunset',
    detail:
      'Book summit tickets 2 months in advance online. Allow 2-3 hours. South pillar has the shortest queue. Stunning views over all of Paris.',
  },
  {
    name: 'Louvre Museum Tour',
    subtitle: 'Museum, closed Tuesdays',
    detail:
      'Enter via Carrousel du Louvre (shorter line). Focus on Denon wing for Mona Lisa and Venus de Milo. Allow 3-4 hours minimum.',
  },
  {
    name: 'Montmartre Walking Tour',
    subtitle: 'Tour, start at Abbesses metro',
    detail:
      'Visit Sacre-Coeur, Place du Tertre artists, and Moulin Rouge. Best in morning before crowds arrive. Allow 2-3 hours.',
  },
  {
    name: 'Seine River Jazz Cruise',
    subtitle: 'Experience, evening departures',
    detail:
      'Departs from Port de la Bourdonnais. Live jazz with champagne and stunning views of illuminated monuments. Book 1 week ahead.',
  },
];

const EMERGENCY_NUMBERS = [
  { label: 'Police, Fire, Ambulance', number: '112' },
  { label: 'Police', number: '17' },
  { label: 'Fire Brigade (Pompiers)', number: '18' },
  { label: 'SAMU (Medical Emergency)', number: '15' },
];

const SAFETY_TIPS = [
  'Keep valuables in hotel safe. Use front pockets in crowded areas.',
  'Watch for pickpockets at Eiffel Tower, metro, and tourist hotspots.',
  'Avoid unlicensed taxis. Use official taxi stands or apps.',
  'Keep a photocopy of your passport separate from the original.',
  'Beware of common scams (fake petitions, friendship bracelets).',
];

// ─── Page ───────────────────────────────────────────────────────

export default function InfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading } = useItineraryScreen(id);
  const trip = MOCK_TRIP;

  const startDate = new Date(trip.start_date + 'T00:00:00');
  const endDate = new Date(trip.end_date + 'T00:00:00');
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-16 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-16 rounded-xl bg-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Trip Overview Card */}
      <div className="rounded-xl p-5 shadow-lg text-white bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={20} />
              <h4 className="text-lg font-bold">{trip.destination}</h4>
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
            badgeColor="bg-purple-100 text-purple-700"
            defaultOpen
          >
            {TRANSPORT_OPTIONS.map((t) => (
              <DetailCard
                key={t.name}
                icon={t.icon}
                title={t.name}
                subtitle={t.subtitle}
                detail={t.detail}
                themeBg="bg-purple-50"
                themeHover="hover:bg-purple-100"
                themeAccent="text-purple-600"
              />
            ))}
          </CollapsibleSection>

          {/* Must-Try Restaurants */}
          <CollapsibleSection
            title="Must-Try Restaurants"
            icon={<Utensils size={18} className="text-red-600" />}
            badge="3 spots"
            badgeColor="bg-red-100 text-red-700"
          >
            {RESTAURANTS.map((r) => (
              <DetailCard
                key={r.name}
                icon={<Utensils size={16} className="text-red-600" />}
                title={r.name}
                subtitle={r.subtitle}
                detail={r.detail}
                themeBg="bg-red-50"
                themeHover="hover:bg-red-100"
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
            badge="3 passes"
            badgeColor="bg-blue-100 text-blue-700"
          >
            {TRANSPORT_PASSES.map((p) => (
              <DetailCard
                key={p.name}
                icon={<CreditCard size={16} className="text-blue-600" />}
                title={p.name}
                subtitle={p.subtitle}
                detail={p.detail}
                themeBg="bg-blue-50"
                themeHover="hover:bg-blue-100"
                themeAccent="text-blue-600"
              />
            ))}
          </CollapsibleSection>

          {/* Must-Do Experiences */}
          <CollapsibleSection
            title="Must-Do Experiences"
            icon={<Camera size={18} className="text-green-600" />}
            badge="4 experiences"
            badgeColor="bg-green-100 text-green-700"
            defaultOpen
          >
            {EXPERIENCES.map((e) => (
              <DetailCard
                key={e.name}
                icon={<Camera size={16} className="text-green-600" />}
                title={e.name}
                subtitle={e.subtitle}
                detail={e.detail}
                themeBg="bg-green-50"
                themeHover="hover:bg-green-100"
                themeAccent="text-green-600"
              />
            ))}
          </CollapsibleSection>

          {/* Emergency Information */}
          <CollapsibleSection
            title="Emergency Information"
            icon={<ShieldAlert size={18} className="text-red-700" />}
            badge="112 &bull; 15"
            badgeColor="bg-red-200 text-red-800"
            bgClass="bg-gradient-to-r from-red-50 to-rose-50"
          >
            {/* Emergency Numbers */}
            <button
              onClick={() => {}}
              className="w-full bg-white p-3 rounded-lg hover:bg-red-50 transition-all cursor-default text-left border border-red-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <Phone size={16} className="text-red-600" />
                <p className="text-sm font-semibold text-gray-900">Emergency Numbers</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EMERGENCY_NUMBERS.map((e) => (
                  <a
                    key={e.number}
                    href={`tel:${e.number}`}
                    className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-center"
                  >
                    <p className="text-lg font-bold text-red-600">{e.number}</p>
                    <p className="text-[11px] text-gray-600">{e.label}</p>
                  </a>
                ))}
              </div>
            </button>

            {/* Hospitals */}
            <button
              onClick={() => {}}
              className="w-full bg-white p-3 rounded-lg hover:bg-red-50 transition-all cursor-default text-left border border-red-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <Ambulance size={16} className="text-red-600" />
                <p className="text-sm font-semibold text-gray-900">Hospitals & Medical</p>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs text-gray-700">
                  <p className="font-medium">Hotel-Dieu Hospital</p>
                  <p className="text-gray-500">1 Place du Parvis Notre-Dame, 75004</p>
                  <a href="tel:+33142348234" className="text-blue-600 hover:underline">+33 1 42 34 82 34</a>
                </div>
                <div className="text-xs text-gray-700">
                  <p className="font-medium">American Hospital of Paris</p>
                  <p className="text-gray-500">63 Blvd Victor Hugo, 92200 Neuilly</p>
                  <a href="tel:+33146412525" className="text-blue-600 hover:underline">+33 1 46 41 25 25</a>
                </div>
              </div>
            </button>

            {/* Safety Tips */}
            <div className="bg-white p-3 rounded-lg border border-amber-300">
              <p className="text-xs font-semibold text-gray-900 mb-2">Important Safety Tips</p>
              <ul className="text-xs text-gray-700 space-y-1">
                {SAFETY_TIPS.map((tip, i) => (
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
