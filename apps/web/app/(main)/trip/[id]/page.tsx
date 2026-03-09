'use client';

import { use, useState } from 'react';
import {
  MapPin, Plane, Building2, ListTodo, Calendar, Users, CalendarPlus, Clock,
  Train, Bus, Footprints, Car, CreditCard, Phone, Shield, Stethoscope,
  UtensilsCrossed, Camera, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useItineraryScreen, getActivityTypeColor, MOCK_TRIP } from '@travyl/shared';
import { ForkAttribution } from '@/components/trip/ForkAttribution';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-gray-200 ${className}`} />;
}

// ─── Collapsible Section (from Trip Info) ─────────────────────

function CollapsibleSection({
  title, icon, iconBg, children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; iconBg: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 transition-colors">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
          {icon}
        </div>
        <span className="text-[13px] font-semibold text-gray-900 flex-1 text-left">{title}</span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? 2000 : 0, opacity: open ? 1 : 0 }}>
        <div className="px-3.5 pb-3.5 pt-0">{children}</div>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, subtitle, detail, iconColor = '#3b82f6' }: {
  icon: React.ReactNode; title: string; subtitle: string; detail: string; iconColor?: string;
}) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="p-2.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setShowDetail(!showDetail)}>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ color: iconColor }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[12px] font-semibold text-gray-900">{title}</h4>
          <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
          {showDetail && (
            <p className="text-[11px] text-gray-600 mt-1.5 bg-white p-2 rounded-lg border border-gray-200 leading-relaxed">{detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────

const TRANSPORT_OPTIONS = [
  { icon: <Train size={16} />, iconColor: '#2563eb', name: 'Metro', description: '3 lines, stations every 500m', detail: 'The Paris Métro is the fastest way around. Lines 1, 4, and 7 serve major tourist areas. Buy a carnet of 10 tickets for savings.' },
  { icon: <Bus size={16} />, iconColor: '#16a34a', name: 'Bus & Tram', description: 'Great for scenic routes', detail: 'Buses are slower but offer great views. The 69 bus passes many landmarks. Noctilien night buses run 12:30–5:30 AM.' },
  { icon: <Footprints size={16} />, iconColor: '#d97706', name: 'Walking', description: 'Most attractions within 30 min', detail: 'Walking is the best way to discover Paris. The Seine banks, Le Marais, and Montmartre are especially pleasant on foot.' },
  { icon: <Car size={16} />, iconColor: '#7c3aed', name: 'Taxis', description: '€15-40 for most trips', detail: 'Official taxis are beige/cream. Uber and Bolt operate in Paris. CDG airport: €50-70 flat rate.' },
];

const EMERGENCY_INFO = [
  { label: 'Emergency', number: '112' },
  { label: 'Police', number: '17' },
  { label: 'SAMU', number: '15' },
];

const SAFETY_TIPS = [
  'Keep valuables in hotel safe. Use front pockets in crowded areas.',
  'Watch for pickpockets at Eiffel Tower, metro, and tourist hotspots.',
];

// ─── Page ─────────────────────────────────────────────────────

export default function TripOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, days, flights, hotels, isLoading } = useItineraryScreen(id);
  const infoTrip = MOCK_TRIP;

  const allActivities = days.flatMap((d) => d.timeGroups.flatMap((g) => g.activities));
  const upcoming = allActivities.slice(0, 5);

  const stats = [
    { icon: Plane, label: 'Flights', count: flights.length, color: '#2563eb', bg: '#dbeafe' },
    { icon: Building2, label: 'Hotels', count: hotels.length, color: '#ea580c', bg: '#ffedd5' },
    { icon: ListTodo, label: 'Activities', count: allActivities.length, color: '#0d9488', bg: '#ccfbf1' },
  ];

  const startDate = new Date(infoTrip.start_date + 'T00:00:00');
  const endDate = new Date(infoTrip.end_date + 'T00:00:00');
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="pb-8 space-y-4">
      {/* Fork Attribution - if this trip was forked */}
      {trip && trip.forked_from_trip_id && (
        <ForkAttribution trip={trip} />
      )}

      {/* Hero card — compact trip info, single row of meta + stats */}
      <div className="rounded-xl overflow-hidden px-4 py-3.5" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}>
        <div className="flex items-center gap-1.5 mb-1">
          <MapPin size={14} className="text-white/70 shrink-0" />
          {trip ? (
            <span className="text-[15px] font-bold text-white truncate">{trip.destination}</span>
          ) : (
            <Skeleton className="h-4 w-32 bg-white/20" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1">
            <Calendar size={11} className="text-white/50" />
            {trip ? (
              <span className="text-[11px] text-white/70">{trip.start_date} – {trip.end_date}</span>
            ) : (
              <Skeleton className="h-2.5 w-28 bg-white/15" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <Users size={11} className="text-white/50" />
            {trip ? (
              <span className="text-[11px] text-white/70">{trip.travelers} travelers</span>
            ) : (
              <Skeleton className="h-2.5 w-16 bg-white/15" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-white/50" />
            <span className="text-[11px] text-white/70">{durationDays} days</span>
          </div>
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-1">
              <stat.icon size={11} className="text-white/50" />
              {isLoading ? (
                <Skeleton className="h-2.5 w-8 bg-white/15" />
              ) : (
                <span className="text-[11px] text-white/70">{stat.count} {stat.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: Upcoming + Quick Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Upcoming Activities */}
        <div>
          <h3 className="text-[14px] font-semibold text-gray-900 mb-2">Upcoming</h3>
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="flex items-center rounded-xl border border-gray-100 bg-white p-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-gray-100 mr-3 shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-[65%]" />
                  <Skeleton className="h-2.5 w-[45%] mt-1" />
                </div>
              </div>
            ))
          ) : upcoming.length > 0 ? (
            upcoming.map((activity) => {
              const typeColor = getActivityTypeColor(activity.category);
              return (
                <div key={activity.id} className="flex items-center rounded-xl border border-gray-100 bg-white p-2.5 mb-1.5 hover:shadow-sm transition-shadow">
                  <div className="w-9 h-9 rounded-lg mr-2.5 shrink-0 flex items-center justify-center" style={{ backgroundColor: typeColor.bg }}>
                    <MapPin size={13} style={{ color: typeColor.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-900 truncate">{activity.name}</p>
                    {activity.locationName && (
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{activity.locationName}</p>
                    )}
                  </div>
                  {activity.timeDisplay && (
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">{activity.timeDisplay}</span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center py-6 bg-white rounded-xl border border-gray-100">
              <CalendarPlus size={20} className="text-gray-300 mb-1.5" />
              <p className="text-[12px] text-gray-400 text-center">No activities yet</p>
            </div>
          )}
        </div>

        {/* Right: Quick Travel Info */}
        <div className="space-y-3">
          <CollapsibleSection
            title="Getting Around"
            icon={<Train size={16} className="text-blue-600" />}
            iconBg="#eff6ff"
            defaultOpen
          >
            <div className="space-y-2">
              {TRANSPORT_OPTIONS.map((t) => (
                <InfoCard key={t.name} icon={t.icon} iconColor={t.iconColor} title={t.name} subtitle={t.description} detail={t.detail} />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Emergency"
            icon={<Phone size={16} className="text-red-500" />}
            iconBg="#fef2f2"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {EMERGENCY_INFO.map((e) => (
                  <a key={e.number} href={`tel:${e.number}`} className="p-2.5 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-center">
                    <p className="text-lg font-bold text-red-600">{e.number}</p>
                    <p className="text-[10px] text-gray-600">{e.label}</p>
                  </a>
                ))}
              </div>
              <div className="space-y-1.5">
                {SAFETY_TIPS.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                    <Shield size={11} className="text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-gray-700">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}
