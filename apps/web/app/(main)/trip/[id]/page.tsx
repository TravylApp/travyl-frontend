'use client';

import { use, useState } from 'react';
import {
  Train, Bus, Footprints, Car, Phone, Shield, ChevronDown, ChevronUp,
  Cloud, Droplets, Sun, AlertTriangle, Newspaper, Sparkles, Lightbulb, ExternalLink,
  Coins, Languages, Plug, Droplet, Map, Clock,
} from 'lucide-react';
import {
  useItineraryScreen,
  MOCK_WEATHER, MOCK_WEATHER_FORECAST, MOCK_NEWS,
} from '@travyl/shared';
import type { NewsItem } from '@travyl/shared';

// ─── Collapsible Section ─────────────────────────────────────

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

// ─── News Category Helpers ───────────────────────────────────

const NEWS_CATEGORY_CONFIG: Record<NewsItem['category'], { icon: typeof Newspaper; color: string; bg: string; label: string }> = {
  event:    { icon: Sparkles,      color: '#7c3aed', bg: '#f5f3ff', label: 'Event' },
  advisory: { icon: AlertTriangle, color: '#d97706', bg: '#fffbeb', label: 'Advisory' },
  news:     { icon: Newspaper,     color: '#2563eb', bg: '#eff6ff', label: 'News' },
  tip:      { icon: Lightbulb,     color: '#059669', bg: '#ecfdf5', label: 'Tip' },
};

// ─── Data ─────────────────────────────────────────────────────

const TRANSPORT_OPTIONS = [
  { icon: <Train size={16} />, iconColor: '#2563eb', name: 'Metro', description: '3 lines, stations every 500m', detail: 'The Paris Métro is the fastest way around. Lines 1, 4, and 7 serve major tourist areas. Buy a carnet of 10 tickets for savings.' },
  { icon: <Bus size={16} />, iconColor: '#16a34a', name: 'Bus & Tram', description: 'Great for scenic routes', detail: 'Buses are slower but offer great views. The 69 bus passes many landmarks. Noctilien night buses run 12:30–5:30 AM.' },
  { icon: <Footprints size={16} />, iconColor: '#d97706', name: 'Walking', description: 'Most attractions within 30 min', detail: 'Walking is the best way to discover Paris. The Seine banks, Le Marais, and Montmartre are especially pleasant on foot.' },
  { icon: <Car size={16} />, iconColor: 'var(--trip-base)', name: 'Taxis', description: '€15-40 for most trips', detail: 'Official taxis are beige/cream. Uber and Bolt operate in Paris. CDG airport: €50-70 flat rate.' },
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

const DESTINATION_TIPS = [
  { icon: <Coins size={14} />, label: 'Currency', value: 'Euro (EUR)' },
  { icon: <Languages size={14} />, label: 'Language', value: 'French (English in tourist areas)' },
  { icon: <Clock size={14} />, label: 'Time Zone', value: 'CET (UTC+1)' },
  { icon: <Coins size={14} />, label: 'Tipping', value: 'Service included; round up' },
  { icon: <Plug size={14} />, label: 'Power', value: 'Type C/E plugs, 230V' },
  { icon: <Droplet size={14} />, label: 'Water', value: 'Tap water is safe' },
];

const QUICK_LINKS = [
  { label: 'Google Maps', icon: <Map size={14} />, url: 'https://maps.google.com/?q=Paris,France' },
  { label: 'Currency', icon: <Coins size={14} />, url: 'https://xe.com' },
  { label: 'Translate', icon: <Languages size={14} />, url: 'https://translate.google.com/?sl=en&tl=fr' },
  { label: 'Local Time', icon: <Clock size={14} />, url: 'https://time.is/Paris' },
];

// ─── Page ─────────────────────────────────────────────────────

export default function TripOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useItineraryScreen(id);

  const weather = MOCK_WEATHER;
  const forecast = MOCK_WEATHER_FORECAST;
  const news = MOCK_NEWS;

  return (
    <div className="pb-8 space-y-4">
      {/* Weather card */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-sky-50 to-blue-50 p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Current conditions */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
              {weather.conditions.toLowerCase().includes('cloud') ? (
                <Cloud size={22} className="text-gray-500" />
              ) : weather.conditions.toLowerCase().includes('rain') ? (
                <Droplets size={22} className="text-blue-500" />
              ) : (
                <Sun size={22} className="text-amber-500" />
              )}
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-gray-900">{weather.high}°</span>
                <span className="text-sm text-gray-400">/ {weather.low}°{weather.unit === 'celsius' ? 'C' : 'F'}</span>
              </div>
              <p className="text-[11px] text-gray-500">{weather.conditions} in {weather.destination}</p>
            </div>
          </div>

          {/* 5-day forecast strip */}
          <div className="hidden sm:flex items-center gap-1.5">
            {forecast.slice(0, 5).map((day) => (
              <div key={day.day} className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-white/60">
                <span className="text-[10px] font-medium text-gray-500">{day.day}</span>
                <span className="text-base leading-none">{day.icon}</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[11px] font-semibold text-gray-800">{day.high}°</span>
                  <span className="text-[9px] text-gray-400">{day.low}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile forecast — horizontal scroll */}
        <div className="flex sm:hidden items-center gap-1.5 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          {forecast.slice(0, 5).map((day) => (
            <div key={day.day} className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-white/60 shrink-0">
              <span className="text-[10px] font-medium text-gray-500">{day.day}</span>
              <span className="text-base leading-none">{day.icon}</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[11px] font-semibold text-gray-800">{day.high}°</span>
                <span className="text-[9px] text-gray-400">{day.low}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible sections */}
      <div className="space-y-3">
        {/* Emergency Contacts */}
        <CollapsibleSection
          title="Emergency Contacts"
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

        {/* Getting Around */}
        <CollapsibleSection
          title="Getting Around"
          icon={<Train size={16} className="text-blue-600" />}
          iconBg="#eff6ff"
        >
          <div className="space-y-2">
            {TRANSPORT_OPTIONS.map((t) => (
              <InfoCard key={t.name} icon={t.icon} iconColor={t.iconColor} title={t.name} subtitle={t.description} detail={t.detail} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Destination Tips */}
        <CollapsibleSection
          title="Destination Tips"
          icon={<Lightbulb size={16} className="text-violet-500" />}
          iconBg="#f5f3ff"
        >
          <div className="space-y-1">
            {DESTINATION_TIPS.map((tip) => (
              <div key={tip.label} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 text-violet-500">
                  {tip.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400">{tip.label}</p>
                  <p className="text-[12px] font-medium text-gray-900">{tip.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Things to Check Out */}
        <CollapsibleSection
          title="Things to Check Out"
          icon={<Newspaper size={16} className="text-blue-600" />}
          iconBg="#eff6ff"
        >
          <div className="space-y-1.5">
            {news.map((item) => {
              const config = NEWS_CATEGORY_CONFIG[item.category];
              const Icon = config.icon;
              return (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-2.5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: config.bg }}
                    >
                      <Icon size={14} style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: config.bg, color: config.color }}
                        >
                          {config.label}
                        </span>
                        <span className="text-[9px] text-gray-400">{item.source}</span>
                      </div>
                      <p className="text-[12px] font-medium text-gray-900 leading-snug">{item.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{item.snippet}</p>
                    </div>
                    {item.url && (
                      <ExternalLink size={11} className="text-gray-300 shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Quick Links */}
        <CollapsibleSection
          title="Quick Links"
          icon={<ExternalLink size={16} style={{ color: 'var(--trip-base)' }} />}
          iconBg="color-mix(in srgb, var(--trip-base) 10%, transparent)"
        >
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'color-mix(in srgb, var(--trip-base) 10%, transparent)', color: 'var(--trip-base)' }}
              >
                {link.icon}
                <span className="text-[12px] font-medium">{link.label}</span>
              </a>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
