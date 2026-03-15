'use client';

import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Calendar as CalendarIcon,
  Clock, MapPin, Camera, Utensils, Hotel, Plane,
  Star, Heart, X, Edit2, Trash2, Plus,
  ExternalLink, Search, GripVertical, ArrowLeftRight,
  Compass, Sunrise, Sun, Moon,
  ChevronDown, ChevronRight as ChevronRightIcon, Users,
  Coffee, Wine, Landmark, Music, ShoppingBag, TreePine,
  StickyNote, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CalendarActivity, CollaboratorPresence } from '@travyl/shared';
import { MOCK_CALENDAR_ACTIVITIES, MOCK_DAYS, MOCK_COLLABORATORS } from '@travyl/shared';
import { useItineraryContext } from './ItineraryContext';

// ─── Constants ──────────────────────────────────────────────

const NAVY = 'var(--trip-base)';
const NAVY_LIGHT = 'var(--trip-base-light)';

const HOUR_HEIGHT = 44;
const ItemTypes = { ACTIVITY: 'activity', DAY: 'day' };

// ─── Discover Data (location-aware suggestions for Paris) ───

interface DiscoverPlace {
  id: string;
  name: string;
  category: 'food' | 'things-to-do' | 'nightlife' | 'coffee';
  type: string; // maps to typeConfig
  image: string;
  rating: number;
  priceLevel: string;
  distance: string;
  location: string;
  description: string;
  duration: number; // hours
}

const DISCOVER_PLACES: DiscoverPlace[] = [
  // Food
  { id: 'disc-1', name: 'Le Bouillon Chartier', category: 'food', type: 'dining', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300', rating: 4.5, priceLevel: '$$', distance: '0.8 mi', location: '7 Rue du Faubourg Montmartre', description: 'Historic Parisian brasserie with Belle Epoque decor', duration: 1.5 },
  { id: 'disc-2', name: 'Breizh Cafe', category: 'food', type: 'dining', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300', rating: 4.6, priceLevel: '$$', distance: '1.2 mi', location: 'Le Marais', description: 'Upscale Breton crepes and artisan cider', duration: 1 },
  { id: 'disc-3', name: 'Chez Janou', category: 'food', type: 'dining', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300', rating: 4.7, priceLevel: '$$$', distance: '0.5 mi', location: '2 Rue Roger Verlomme', description: 'Famous for 80+ chocolate mousse and Provencal cuisine', duration: 1.5 },
  { id: 'disc-4', name: 'L\'As du Fallafel', category: 'food', type: 'dining', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300', rating: 4.4, priceLevel: '$', distance: '1.0 mi', location: '34 Rue des Rosiers', description: 'Legendary falafel in the heart of Le Marais', duration: 0.75 },
  { id: 'disc-5', name: 'Pink Mamma', category: 'food', type: 'dining', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300', rating: 4.3, priceLevel: '$$', distance: '1.5 mi', location: '20bis Rue de la Folie-Mericourt', description: '4-story Italian restaurant with rooftop terrace', duration: 1.5 },

  // Things to do
  { id: 'disc-6', name: 'Musee de l\'Orangerie', category: 'things-to-do', type: 'museum', image: 'https://images.unsplash.com/photo-1499426600726-ac29ced5e5b8?w=300', rating: 4.8, priceLevel: '$', distance: '0.3 mi', location: 'Jardin des Tuileries', description: 'Monet\'s Water Lilies in oval galleries', duration: 2 },
  { id: 'disc-7', name: 'Palais Garnier Opera Tour', category: 'things-to-do', type: 'cultural', image: 'https://images.unsplash.com/photo-1580809361436-42a7ec204889?w=300', rating: 4.7, priceLevel: '$$', distance: '0.6 mi', location: 'Place de l\'Opera', description: 'Self-guided tour of the legendary opera house', duration: 1.5 },
  { id: 'disc-8', name: 'Marche aux Puces de Saint-Ouen', category: 'things-to-do', type: 'shopping', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=300', rating: 4.3, priceLevel: 'Free', distance: '3.2 mi', location: 'Porte de Clignancourt', description: 'World\'s largest antique market, 2,500+ vendors', duration: 3 },
  { id: 'disc-9', name: 'Seine Riverbank Walk', category: 'things-to-do', type: 'outdoor', image: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=300', rating: 4.6, priceLevel: 'Free', distance: '0.1 mi', location: 'Quai de la Tournelle', description: 'Stroll past bookstalls and bridges at golden hour', duration: 1.5 },
  { id: 'disc-10', name: 'Cooking Class at La Cuisine Paris', category: 'things-to-do', type: 'tour', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300', rating: 4.9, priceLevel: '$$$', distance: '0.7 mi', location: '80 Quai de l\'Hotel de Ville', description: 'Learn croissants and macarons from local chefs', duration: 3 },

  // Nightlife
  { id: 'disc-11', name: 'Le Caveau de la Huchette', category: 'nightlife', type: 'nightlife', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', rating: 4.5, priceLevel: '$$', distance: '0.4 mi', location: '5 Rue de la Huchette', description: 'Live jazz and swing in a medieval cellar since 1946', duration: 3 },
  { id: 'disc-12', name: 'Le Perchoir Menilmontant', category: 'nightlife', type: 'nightlife', image: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=300', rating: 4.4, priceLevel: '$$', distance: '2.1 mi', location: '14 Rue Crespin du Gast', description: 'Rooftop cocktails with panoramic city views', duration: 2 },
  { id: 'disc-13', name: 'Harry\'s New York Bar', category: 'nightlife', type: 'nightlife', image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=300', rating: 4.6, priceLevel: '$$$', distance: '0.5 mi', location: '5 Rue Daunou', description: 'Legendary cocktail bar — birthplace of the Bloody Mary', duration: 2 },

  // Coffee
  { id: 'disc-14', name: 'Cafe de Flore', category: 'coffee', type: 'dining', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300', rating: 4.3, priceLevel: '$$', distance: '0.6 mi', location: '172 Boulevard Saint-Germain', description: 'Iconic literary cafe, Sartre and de Beauvoir\'s hangout', duration: 1 },
  { id: 'disc-15', name: 'Boot Cafe', category: 'coffee', type: 'dining', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300', rating: 4.7, priceLevel: '$', distance: '0.9 mi', location: '19 Rue du Pont aux Choux', description: 'Tiny specialty coffee shop in a former cobbler\'s shop', duration: 0.75 },
];

const DISCOVER_CATEGORIES = [
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'things-to-do', label: 'To Do', icon: Compass },
  { id: 'nightlife', label: 'Nightlife', icon: Wine },
  { id: 'coffee', label: 'Coffee', icon: Coffee },
] as const;

// ─── Type Config ────────────────────────────────────────────

const typeConfig: Record<string, {
  label: string; color: string; bgColor: string; bgGradient: string;
  textColor: string; icon: typeof Camera; dotColor: string;
}> = {
  sightseeing: { label: 'Sightseeing', color: '#0d9488', bgColor: 'bg-teal-50', bgGradient: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', textColor: 'text-teal-800', icon: Camera, dotColor: 'bg-teal-500' },
  tour: { label: 'Tour', color: '#8b5cf6', bgColor: 'bg-purple-50', bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #e9d5ff 100%)', textColor: 'text-purple-800', icon: Compass, dotColor: 'bg-purple-400' },
  dining: { label: 'Dining', color: '#ea580c', bgColor: 'bg-orange-50', bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', textColor: 'text-orange-800', icon: Utensils, dotColor: 'bg-orange-500' },
  cultural: { label: 'Cultural', color: '#6366f1', bgColor: 'bg-indigo-50', bgGradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', textColor: 'text-indigo-800', icon: Landmark, dotColor: 'bg-indigo-400' },
  shopping: { label: 'Shopping', color: '#ec4899', bgColor: 'bg-pink-50', bgGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', textColor: 'text-pink-800', icon: ShoppingBag, dotColor: 'bg-pink-400' },
  nightlife: { label: 'Nightlife', color: '#7c3aed', bgColor: 'bg-violet-50', bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', textColor: 'text-violet-800', icon: Music, dotColor: 'bg-violet-500' },
  outdoor: { label: 'Outdoor', color: '#16a34a', bgColor: 'bg-green-50', bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', textColor: 'text-green-800', icon: TreePine, dotColor: 'bg-green-500' },
  museum: { label: 'Museum', color: '#2563eb', bgColor: 'bg-blue-50', bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', textColor: 'text-blue-800', icon: Landmark, dotColor: 'bg-blue-500' },
  event: { label: 'Event', color: '#dc2626', bgColor: 'bg-red-50', bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', textColor: 'text-red-800', icon: Star, dotColor: 'bg-red-500' },
  hotel: { label: 'Hotel', color: '#0891b2', bgColor: 'bg-cyan-50', bgGradient: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)', textColor: 'text-cyan-800', icon: Hotel, dotColor: 'bg-cyan-500' },
  transport: { label: 'Transport', color: '#64748b', bgColor: 'bg-slate-50', bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', textColor: 'text-slate-700', icon: Plane, dotColor: 'bg-slate-500' },
};

function getConfig(type: string) {
  return typeConfig[type] ?? typeConfig.sightseeing;
}

const TIME_SECTIONS = [
  { label: 'Morning', startHour: 7, endHour: 12, icon: Sunrise, color: '#f59e0b' },
  { label: 'Afternoon', startHour: 12, endHour: 17, icon: Sun, color: '#ef4444' },
  { label: 'Evening', startHour: 17, endHour: 24, icon: Moon, color: '#6366f1' },
];

// ─── Calendar Note ──────────────────────────────────────────

interface CalendarNote {
  id: string;
  day: number;
  hour: number;
  text: string;
  color: string;
}

const NOTE_COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#ede9fe'];

// ─── Helpers ────────────────────────────────────────────────

function isParent(activity: CalendarActivity, allActivities: CalendarActivity[]) {
  return allActivities.some((a) => a.parentId === activity.id);
}

function getChildren(parentId: string, allActivities: CalendarActivity[]) {
  return allActivities.filter((a) => a.parentId === parentId && a.onCalendar);
}

// ─── Discover Card (left panel) ─────────────────────────────

const DiscoverCard = memo(({
  place, onAdd,
}: {
  place: DiscoverPlace;
  onAdd: (place: DiscoverPlace) => void;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ACTIVITY,
    item: { id: `discover-${place.id}`, fromDiscover: true, place },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [place]);

  return (
    <div
      ref={(node: HTMLDivElement | null) => { drag(node); }}
      className={`group rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${isDragging ? 'opacity-30 scale-95' : ''}`}
      style={{ background: '#fff', border: '1px solid #e5e7eb' }}
    >
      <div className="flex gap-3 p-2.5">
        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
          <img src={place.image} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1 py-0.5">
            <div className="flex items-center gap-0.5 justify-center">
              <Star size={8} className="fill-yellow-400 text-yellow-400" />
              <span className="text-[9px] font-bold text-white">{place.rating}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <h4 className="text-[12px] font-semibold text-gray-900 truncate leading-tight">{place.name}</h4>
          <p className="text-[10px] text-gray-400 truncate mt-0.5">{place.description}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-medium text-gray-500">{place.priceLevel}</span>
            <span className="text-[10px] text-gray-300">|</span>
            <span className="text-[10px] text-gray-400">{place.distance}</span>
            <span className="text-[10px] text-gray-300">|</span>
            <span className="text-[10px] text-gray-400">{place.duration}h</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(place); }}
          className="self-center p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 cursor-pointer"
        >
          <Plus size={14} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
});

DiscoverCard.displayName = 'DiscoverCard';

// ─── Parent Block Card ──────────────────────────────────────

const ParentBlockCard = memo(({
  activity, children: childActivities, onCardClick, onSwapActivities, onRemove,
  totalDays, expandedParents, onToggleExpand, collaborators, isDimmed,
}: {
  activity: CalendarActivity;
  children: CalendarActivity[];
  onCardClick: (a: CalendarActivity) => void;
  onSwapActivities: (draggedId: string, targetId: string) => void;
  onRemove: (id: string) => void;
  totalDays: number;
  expandedParents: Set<string>;
  onToggleExpand: (id: string) => void;
  collaborators: CollaboratorPresence[];
  isDimmed?: boolean;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ACTIVITY,
    item: { id: activity.id, day: activity.day, startHour: activity.startHour },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [activity.id, activity.day, activity.startHour]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ACTIVITY,
    drop: (item: { id: string }) => {
      if (item.id !== activity.id) onSwapActivities(item.id, activity.id);
    },
    collect: (m) => ({ isOver: m.isOver() && m.getItem()?.id !== activity.id }),
  }), [activity.id, onSwapActivities]);

  const config = getConfig(activity.type);
  const Icon = config.icon;
  const dayWidth = 100 / totalDays;
  const left = activity.day * dayWidth;
  const topPx = (activity.startHour - 7) * HOUR_HEIGHT;
  const heightPx = activity.duration * HOUR_HEIGHT;
  const cardHeight = Math.max(heightPx - 2, HOUR_HEIGHT * 2);
  const isExpanded = expandedParents.has(activity.id);
  const blockCollaborators = collaborators.filter((c) => c.selectedBlockId === activity.id);
  const sortedChildren = [...childActivities].sort((a, b) => a.startHour - b.startHour);

  return (
    <div
      ref={(node: HTMLDivElement | null) => { drag(drop(node)); }}
      className={`absolute rounded-xl cursor-move overflow-hidden group transition-all duration-200 ${
        isOver ? 'ring-2 ring-green-400 ring-offset-1 z-40 scale-[1.02]' : 'hover:shadow-xl hover:z-30'
      }`}
      style={{
        left: `${left}%`, width: `calc(${dayWidth}% - 8px)`,
        top: `${topPx}px`, height: `${cardHeight}px`,
        margin: '1px 4px',
        opacity: isDragging ? 0.3 : isDimmed ? 0.3 : 1,
        transition: 'opacity 0.2s',
        zIndex: isDragging ? 1000 : isOver ? 999 : 3,
        boxShadow: '0 2px 8px rgb(var(--trip-base-rgb) / 0.12)',
      }}
    >
      {isOver && (
        <div className="absolute inset-0 bg-green-400/20 backdrop-blur-[1px] flex items-center justify-center z-50 pointer-events-none rounded-xl">
          <div className="bg-green-500 text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 shadow">
            <Plus size={10} /> Add inside
          </div>
        </div>
      )}

      {blockCollaborators.length > 0 && (
        <div className="absolute -top-1 -right-1 flex -space-x-1.5 z-30">
          {blockCollaborators.map((c) => (
            <div key={c.userId} className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm" style={{ backgroundColor: c.color }} title={`${c.name} is viewing`}>
              {c.avatarInitial}
            </div>
          ))}
        </div>
      )}

      {/* Background */}
      <div className="absolute inset-0">
        {activity.image ? (
          <img src={activity.image} alt={activity.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full" style={{ background: config.bgGradient }} />
        )}
        <div className="absolute inset-0" style={{
          background: isExpanded
            ? 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.6) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.55) 100%)',
        }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-1.5 px-2.5 pt-2 pb-1">
        <div className="w-5 h-5 rounded-md flex items-center justify-center shadow-sm flex-shrink-0" style={{ background: config.color }}>
          <Icon size={10} className="text-white" />
        </div>
        <p className="text-white text-[11px] font-bold truncate flex-1 drop-shadow-md">{activity.title}</p>
        <span className="text-[9px] text-white/50 mr-1 hidden sm:inline">{activity.startTime} – {activity.endTime}</span>
        {/* Hover delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(activity.id); }}
          className="p-0.5 rounded hover:bg-red-500/80 bg-red-500/0 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
          title="Remove"
        >
          <X size={11} className="text-white/80" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(activity.id); }} className="p-0.5 rounded hover:bg-white/20 transition-colors flex-shrink-0">
          {isExpanded ? <ChevronDown size={12} className="text-white/80" /> : <ChevronRightIcon size={12} className="text-white/80" />}
        </button>
      </div>

      {/* Collapsed: chip summary */}
      {!isExpanded && (
        <div className="relative z-10 px-2.5 mt-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            {sortedChildren.slice(0, 3).map((child) => {
              const cfg = getConfig(child.type);
              const CIcon = cfg.icon;
              return (
                <div key={child.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
                  <CIcon size={8} className="text-white/90" />
                  <span className="text-[8px] text-white/90 font-medium truncate max-w-[60px]">{child.title}</span>
                </div>
              );
            })}
            {sortedChildren.length > 3 && <span className="text-[8px] text-white/50">+{sortedChildren.length - 3}</span>}
          </div>
        </div>
      )}

      {/* Expanded: time-aligned sub-cards over the image */}
      {isExpanded && (
        <div className="absolute inset-0 z-10 pt-[32px]" style={{ pointerEvents: 'none' }}>
          {sortedChildren.map((child) => {
            const cfg = getConfig(child.type);
            const CIcon = cfg.icon;
            const relativeStart = child.startHour - activity.startHour;
            const topPct = (relativeStart / activity.duration) * 100;
            const heightPct = (child.duration / activity.duration) * 100;
            return (
              <div
                key={child.id}
                className="absolute left-1 right-1 rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group/sub"
                onClick={(e) => { e.stopPropagation(); onCardClick(child); }}
                style={{
                  top: `${topPct}%`,
                  height: `${Math.max(heightPct, 5)}%`,
                  minHeight: '20px',
                  pointerEvents: 'auto',
                  backgroundColor: `${cfg.color}dd`,
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div className="flex items-center gap-1 px-1.5 h-full">
                  <CIcon size={9} className="text-white/90 flex-shrink-0" />
                  <span className="text-[9px] font-semibold text-white truncate leading-tight">{child.title}</span>
                  <span className="text-[7px] text-white/50 ml-auto flex-shrink-0 hidden sm:inline">{child.startTime}</span>
                  {/* Sub-activity delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(child.id); }}
                    className="p-0.5 rounded opacity-0 group-hover/sub:opacity-100 hover:bg-white/20 transition-all flex-shrink-0"
                  >
                    <X size={8} className="text-white/80" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom */}
      {!isExpanded && cardHeight > 80 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-2.5 pb-1.5">
          <div className="flex items-center gap-1.5">
            {activity.rating && (
              <div className="flex items-center gap-0.5">
                <Star size={8} className="fill-yellow-400 text-yellow-400" />
                <span className="text-[9px] text-white font-semibold">{activity.rating}</span>
              </div>
            )}
            {activity.price && <span className="text-[9px] text-white/70 font-medium">{activity.price}</span>}
            <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full font-medium ml-auto">{childActivities.length} activities</span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-[5]" onClick={(e) => { e.stopPropagation(); if (!isDragging) onCardClick(activity); }} style={{ pointerEvents: isExpanded ? 'none' : 'auto' }} />
    </div>
  );
});

ParentBlockCard.displayName = 'ParentBlockCard';

// ─── Regular Activity Card ──────────────────────────────────

const CalendarCard = memo(({
  activity, onCardClick, onSwapActivities, onRemove, totalDays, collaborators, isDimmed,
}: {
  activity: CalendarActivity;
  onCardClick: (a: CalendarActivity) => void;
  onSwapActivities: (draggedId: string, targetId: string) => void;
  onRemove: (id: string) => void;
  totalDays: number;
  collaborators: CollaboratorPresence[];
  isDimmed?: boolean;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ACTIVITY,
    item: { id: activity.id, day: activity.day, startHour: activity.startHour },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [activity.id, activity.day, activity.startHour]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ACTIVITY,
    drop: (item: { id: string }) => {
      if (item.id !== activity.id) onSwapActivities(item.id, activity.id);
    },
    collect: (m) => ({ isOver: m.isOver() && m.getItem()?.id !== activity.id }),
  }), [activity.id, onSwapActivities]);

  const config = getConfig(activity.type);
  const Icon = config.icon;
  const dayWidth = 100 / totalDays;
  const left = activity.day * dayWidth;
  const topPx = (activity.startHour - 7) * HOUR_HEIGHT;
  const heightPx = activity.duration * HOUR_HEIGHT;
  const cardHeight = Math.max(heightPx - 2, HOUR_HEIGHT * 0.85);
  const isTiny = cardHeight < 50;
  const blockCollaborator = collaborators.find((c) => c.selectedBlockId === activity.id);

  return (
    <div
      ref={(node: HTMLDivElement | null) => { drag(drop(node)); }}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onCardClick(activity); }}
      className={`absolute rounded-xl cursor-move overflow-hidden group transition-all duration-200 ${
        isOver ? 'ring-2 ring-amber-400 ring-offset-1 z-40 scale-[1.02]' : 'hover:shadow-lg hover:z-30 hover:scale-[1.01]'
      }`}
      style={{
        left: `${left}%`, width: `calc(${dayWidth}% - 8px)`,
        top: `${topPx}px`, height: `${cardHeight}px`,
        margin: '1px 4px',
        opacity: isDragging ? 0.3 : isDimmed ? 0.3 : 1,
        transition: 'opacity 0.2s',
        zIndex: isDragging ? 1000 : isOver ? 999 : 2,
        boxShadow: blockCollaborator
          ? `0 0 0 2px ${blockCollaborator.color}, 0 1px 4px rgba(0,0,0,0.08)`
          : '0 1px 4px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${config.color}`,
      }}
    >
      {blockCollaborator && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold text-white shadow-sm z-20" style={{ backgroundColor: blockCollaborator.color }} title={`${blockCollaborator.name} is viewing`}>
          {blockCollaborator.avatarInitial}
        </div>
      )}

      {isOver && (
        <div className="absolute inset-0 bg-amber-400/20 backdrop-blur-[1px] flex items-center justify-center z-50 pointer-events-none rounded-xl">
          <div className="bg-amber-500 text-white px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 shadow">
            <ArrowLeftRight size={10} /> Swap
          </div>
        </div>
      )}

      {/* Hover actions */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(activity.id); }}
          className="p-1 bg-red-500/90 hover:bg-red-600 backdrop-blur-sm rounded-md cursor-pointer transition-colors"
          title="Remove"
        >
          <X size={10} className="text-white" />
        </button>
        <div className="p-0.5 bg-black/30 backdrop-blur-sm rounded">
          <GripVertical size={10} className="text-white" />
        </div>
      </div>

      {isTiny ? (
        <div className="h-full flex items-center gap-1.5 px-2 overflow-hidden" style={{ background: config.bgGradient }}>
          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${config.dotColor}`}>
            <Icon size={8} className="text-white" />
          </div>
          <span className={`text-[10px] font-semibold ${config.textColor} truncate`}>{activity.title}</span>
        </div>
      ) : (
        <div className="h-full w-full relative overflow-hidden">
          {activity.image ? (
            <img src={activity.image} alt={activity.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="absolute inset-0" style={{ background: config.bgGradient }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent pointer-events-none" />
          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center shadow-md z-10" style={{ background: config.color }}>
            <Icon size={10} className="text-white" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-3 z-10">
            <p className="text-white text-[10px] font-semibold truncate leading-tight drop-shadow-md">{activity.title}</p>
            {cardHeight >= 65 && (
              <p className="text-white/65 text-[9px] mt-0.5 truncate">{activity.startTime} – {activity.endTime}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CalendarCard.displayName = 'CalendarCard';

// ─── Drop Zone ──────────────────────────────────────────────

const DropZone = memo(({ day, hour, onDrop, onDoubleClick, isEvenDay }: {
  day: number; hour: number;
  onDrop: (activityId: string, day: number, startHour: number, fromDiscover?: boolean, place?: DiscoverPlace) => void;
  onDoubleClick: (day: number, hour: number) => void;
  isEvenDay: boolean;
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ACTIVITY,
    drop: (item: { id: string; fromDiscover?: boolean; place?: DiscoverPlace }) => onDrop(item.id, day, hour, item.fromDiscover, item.place),
    collect: (m) => ({ isOver: m.isOver() }),
  }), [day, hour, onDrop]);

  return (
    <div
      ref={(node: HTMLDivElement | null) => { drop(node); }}
      onDoubleClick={() => onDoubleClick(day, hour)}
      className={`border-b transition-colors ${
        isOver ? 'bg-blue-50 border-b-blue-200' : isEvenDay ? 'border-b-gray-50 bg-gray-25' : 'border-b-gray-50'
      }`}
      style={{ height: `${HOUR_HEIGHT}px` }}
    />
  );
});

DropZone.displayName = 'DropZone';

// ─── Day Header ─────────────────────────────────────────────

const DraggableDayHeader = memo(({
  day, dayMeta, onSwapDays, activityCount, isSelected, onSelectDay,
}: {
  day: number;
  dayMeta: { dayLabel: string; dateLabel: string; theme: string } | undefined;
  onSwapDays: (d1: number, d2: number) => void;
  activityCount: number;
  isSelected: boolean;
  onSelectDay: (day: number) => void;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.DAY, item: { day },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [day]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.DAY,
    drop: (item: { day: number }) => { if (item.day !== day) onSwapDays(item.day, day); },
    collect: (m) => ({ isOver: m.isOver() && m.getItem()?.day !== day }),
  }), [day, onSwapDays]);

  return (
    <div
      ref={(node: HTMLDivElement | null) => { drag(drop(node)); }}
      onClick={() => onSelectDay(day)}
      className={`flex-1 text-center cursor-pointer transition-all relative border-r border-gray-100 last:border-r-0 ${
        isOver ? 'ring-2 ring-inset ring-amber-400' : isDragging ? 'opacity-25' : ''
      }`}
      style={{ background: isOver ? '#fef9c3' : isSelected ? '#ffffff' : '#f9fafb' }}
    >
      {isSelected && <div className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full" style={{ backgroundColor: NAVY }} />}
      <div className="py-2.5 px-1 relative z-10">
        <div className={`text-[10px] font-medium uppercase tracking-wider ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}>
          {dayMeta?.dateLabel ?? `Day ${day + 1}`}
        </div>
        <div className={`text-sm font-bold mt-0.5 leading-none ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
          {dayMeta?.dayLabel ?? `Day ${day + 1}`}
        </div>
        {dayMeta?.theme && (
          <div className={`text-[9px] mt-0.5 font-medium ${isSelected ? '' : 'text-gray-400'}`} style={isSelected ? { color: 'var(--trip-base)' } : undefined}>{dayMeta.theme}</div>
        )}
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {activityCount > 0 ? Array.from({ length: Math.min(activityCount, 5) }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? NAVY : '#d1d5db' }} />
          )) : <span className="text-[8px] text-gray-300">--</span>}
        </div>
      </div>
    </div>
  );
});

DraggableDayHeader.displayName = 'DraggableDayHeader';

// ─── Main CalendarView ──────────────────────────────────────

export interface CalendarViewProps {
  destination?: string;
}

export function CalendarView({ destination = 'Paris' }: CalendarViewProps) {
  const { activities, setActivities } = useItineraryContext();
  const [selectedActivity, setSelectedActivity] = useState<CalendarActivity | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set(['cal-disney']));
  const [collaborators] = useState<CollaboratorPresence[]>(MOCK_COLLABORATORS);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Notes
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Discover panel state
  const [discoverCategory, setDiscoverCategory] = useState<string>('food');
  const [discoverSearch, setDiscoverSearch] = useState('');

  const dayMetas = MOCK_DAYS.map((d) => ({
    dayLabel: d.dayLabel, dateLabel: d.dateLabel, theme: d.theme ?? '',
  }));

  const totalDays = Math.max(dayMetas.length, ...activities.filter((a) => a.onCalendar).map((a) => a.day + 1));
  const timeSlots = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 7), []);

  const calendarActivities = useMemo(() => {
    return activities.filter((a) => a.onCalendar && !a.parentId);
  }, [activities]);

  const activityCountPerDay = useMemo(() => {
    const counts: Record<number, number> = {};
    calendarActivities.forEach((a) => { counts[a.day] = (counts[a.day] || 0) + 1; });
    return counts;
  }, [calendarActivities]);

  const filteredDiscoverPlaces = useMemo(() => {
    return DISCOVER_PLACES.filter((p) => {
      const matchesCat = p.category === discoverCategory;
      const matchesSearch = !discoverSearch ||
        p.name.toLowerCase().includes(discoverSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(discoverSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [discoverCategory, discoverSearch]);

  // Handlers
  const handleActivityClick = useCallback((a: CalendarActivity) => setSelectedActivity(a), []);

  const handleRemoveFromCalendar = useCallback((id: string) => {
    setActivities((prev) => prev.map((a) => a.id === id ? { ...a, onCalendar: false, parentId: undefined } : a));
    setSelectedActivity(null);
  }, []);

  const handleSelectDay = useCallback((day: number) => {
    setSelectedDay((prev) => prev === day ? null : day);
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleAddNote = useCallback((day: number, hour: number) => {
    const id = `note-${Date.now()}`;
    const color = NOTE_COLORS[notes.length % NOTE_COLORS.length];
    setNotes((prev) => [...prev, { id, day, hour, text: '', color }]);
    setEditingNoteId(id);
  }, [notes.length]);

  const handleUpdateNote = useCallback((id: string, text: string) => {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, text } : n));
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingNoteId === id) setEditingNoteId(null);
  }, [editingNoteId]);

  const handleRemoveDirectly = useCallback((id: string) => {
    setActivities((prev) => prev.map((a) => a.id === id ? { ...a, onCalendar: false, parentId: undefined } : a));
  }, []);

  const formatTime = useCallback((hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const dh = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const dm = minute === 0 ? '00' : minute < 10 ? `0${minute}` : String(minute);
    return `${dh}:${dm} ${period}`;
  }, []);

  const handleDrop = useCallback((activityId: string, newDay: number, newStartHour: number, fromDiscover?: boolean, place?: DiscoverPlace) => {
    if (fromDiscover && place) {
      // Add discover place as new calendar activity
      const end = newStartHour + place.duration;
      const newActivity: CalendarActivity = {
        id: `cal-${place.id}`,
        title: place.name,
        type: place.type,
        day: newDay,
        startHour: newStartHour,
        duration: place.duration,
        startTime: formatTime(newStartHour, 0),
        endTime: formatTime(Math.floor(end), (end % 1) * 60),
        location: place.location,
        image: place.image,
        rating: place.rating,
        price: place.priceLevel,
        color: getConfig(place.type).color,
        onCalendar: true,
      };
      setActivities((prev) => [...prev, newActivity]);
      return;
    }

    setActivities((prev) => prev.map((act) => {
      if (act.id === activityId) {
        const end = newStartHour + act.duration;
        return {
          ...act, day: newDay, startHour: newStartHour,
          startTime: formatTime(newStartHour, 0),
          endTime: formatTime(Math.floor(end), (end % 1) * 60),
          onCalendar: true, parentId: undefined,
        };
      }
      return act;
    }));
  }, [formatTime]);

  const handleSwapActivities = useCallback((dId: string, tId: string) => {
    setActivities((prev) => {
      const target = prev.find((a) => a.id === tId);
      const dragged = prev.find((a) => a.id === dId);
      if (!target || !dragged) return prev;

      if (isParent(target, prev) && !dragged.parentId) {
        return prev.map((a) => a.id === dId ? { ...a, parentId: tId, day: target.day, onCalendar: true } : a);
      }

      const di = prev.findIndex((a) => a.id === dId);
      const ti = prev.findIndex((a) => a.id === tId);
      if (di === -1 || ti === -1) return prev;
      const n = [...prev];
      const d = { ...n[di] };
      const t = { ...n[ti] };
      n[di] = { ...d, day: t.day, startHour: t.startHour, startTime: t.startTime, endTime: t.endTime };
      n[ti] = { ...t, day: d.day, startHour: d.startHour, startTime: d.startTime, endTime: d.endTime };
      return n;
    });
  }, []);

  const handleSwapDays = useCallback((d1: number, d2: number) => {
    setActivities((prev) => prev.map((a) => {
      if (a.day === d1) return { ...a, day: d2 };
      if (a.day === d2) return { ...a, day: d1 };
      return a;
    }));
  }, []);

  const handleAddDiscoverPlace = useCallback((place: DiscoverPlace) => {
    // Add to first empty-ish slot on the selected day or day 0
    const targetDay = selectedDay ?? 0;
    const dayActivities = activities.filter((a) => a.onCalendar && a.day === targetDay && !a.parentId);
    const usedHours = new Set<number>();
    dayActivities.forEach((a) => {
      for (let h = Math.floor(a.startHour); h < Math.ceil(a.startHour + a.duration); h++) usedHours.add(h);
    });

    let startHour = 9;
    for (let h = 9; h <= 20; h++) {
      if (!usedHours.has(h)) { startHour = h; break; }
    }

    handleDrop(`discover-${place.id}`, targetDay, startHour, true, place);
  }, [activities, selectedDay, handleDrop]);

  const gridHeight = timeSlots.length * HOUR_HEIGHT;
  const getTimeSection = (hour: number) => TIME_SECTIONS.find((s) => hour >= s.startHour && hour < s.endHour);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full h-[calc(100vh-220px)] min-h-[600px] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white relative">

        {/* ── Minimal Toolbar ──────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLeftPanel(!showLeftPanel)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                showLeftPanel
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={showLeftPanel ? { backgroundColor: 'var(--trip-base)' } : undefined}
            >
              <Search size={13} />
              <span>Discover {destination}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Collaborator avatars — subtle */}
            <div className="flex -space-x-1.5">
              {collaborators.filter((c) => c.isOnline).map((c) => (
                <div
                  key={c.userId}
                  className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                >
                  {c.avatarInitial}
                </div>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-gray-400">
              <StickyNote size={10} />
              <span>Double-click to add note</span>
            </div>
            <div className="text-[11px] text-gray-400 font-medium">
              {calendarActivities.length} planned
            </div>
          </div>
        </div>

        {/* ── Main Area ──────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left Panel — Discover */}
          <AnimatePresence>
            {showLeftPanel && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex-shrink-0 border-r border-gray-100 overflow-hidden bg-white"
              >
                <div className="w-[320px] h-full flex flex-col">
                  {/* Search header */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder={`Search in ${destination}...`}
                        value={discoverSearch}
                        onChange={(e) => setDiscoverSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-trip-base/20 focus:border-trip-base/30 placeholder:text-gray-400"
                      />
                      {discoverSearch && (
                        <button onClick={() => setDiscoverSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-1 mt-2.5">
                      {DISCOVER_CATEGORIES.map((cat) => {
                        const CatIcon = cat.icon;
                        const isActive = discoverCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setDiscoverCategory(cat.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                              isActive
                                ? 'text-white shadow-sm'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                            style={isActive ? { backgroundColor: 'var(--trip-base)' } : undefined}
                          >
                            <CatIcon size={12} />
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Drag onto your calendar or tap + to add</p>
                  </div>

                  {/* Results */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {filteredDiscoverPlaces.length === 0 ? (
                      <div className="text-center py-12">
                        <Search size={24} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">No results found</p>
                        <p className="text-[11px] text-gray-300 mt-1">Try a different search or category</p>
                      </div>
                    ) : (
                      filteredDiscoverPlaces.map((place) => (
                        <DiscoverCard key={place.id} place={place} onAdd={handleAddDiscoverPlace} />
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Calendar Grid ────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="flex-1 overflow-auto">
              <div className="flex min-w-0">
                {/* Time gutter */}
                <div className="sticky left-0 z-10 flex-shrink-0 bg-white" style={{ width: '52px' }}>
                  <div className="border-b border-gray-100 flex items-end justify-center pb-1" style={{ height: '68px' }}>
                    <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Time</span>
                  </div>
                  {timeSlots.map((hour, i) => {
                    const section = getTimeSection(hour);
                    const isNewSection = i === 0 || getTimeSection(timeSlots[i - 1]) !== section;
                    return (
                      <div
                        key={hour}
                        className={`border-b border-gray-50 flex items-start justify-end pr-2 pt-0.5 relative ${isNewSection ? 'border-t border-t-gray-100' : ''}`}
                        style={{ height: `${HOUR_HEIGHT}px` }}
                      >
                        <span className="text-[10px] font-medium leading-none text-gray-400">
                          {hour === 12 ? '12p' : hour < 12 ? `${hour}a` : `${hour - 12}p`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Days grid */}
                <div className="flex-1 relative min-w-0">
                  <div className="flex sticky top-0 z-20 border-b border-gray-200 bg-white">
                    {Array.from({ length: totalDays }, (_, i) => (
                      <DraggableDayHeader
                        key={i} day={i} dayMeta={dayMetas[i]}
                        onSwapDays={handleSwapDays}
                        activityCount={activityCountPerDay[i] || 0}
                        isSelected={selectedDay === null || selectedDay === i}
                        onSelectDay={handleSelectDay}
                      />
                    ))}
                  </div>

                  <div className="flex relative" style={{ height: `${gridHeight}px` }}>
                    {Array.from({ length: totalDays }, (_, day) => {
                      const isDimmed = selectedDay !== null && selectedDay !== day;
                      return (
                        <div key={day} className="flex-1 border-r border-gray-50 flex flex-col transition-opacity duration-200" style={{ opacity: isDimmed ? 0.3 : 1 }}>
                          {timeSlots.map((hour) => (
                            <DropZone key={`${day}-${hour}`} day={day} hour={hour} onDrop={handleDrop} onDoubleClick={handleAddNote} isEvenDay={day % 2 === 0} />
                          ))}
                        </div>
                      );
                    })}

                    {/* Time dividers */}
                    {TIME_SECTIONS.slice(1).map((section) => {
                      const topPx = (section.startHour - 7) * HOUR_HEIGHT;
                      return (
                        <div key={section.label} className="absolute left-0 right-0 pointer-events-none z-[1]" style={{ top: `${topPx}px` }}>
                          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${section.color}25, ${section.color}08, ${section.color}25)` }} />
                        </div>
                      );
                    })}

                    {/* Now indicator */}
                    {(() => {
                      const now = new Date();
                      const nowHour = now.getHours() + now.getMinutes() / 60;
                      if (nowHour < 7 || nowHour > 24) return null;
                      const nowPx = (nowHour - 7) * HOUR_HEIGHT;
                      return (
                        <div className="absolute left-0 right-0 z-[3] pointer-events-none flex items-center" style={{ top: `${nowPx}px` }}>
                          <div className="w-2 h-2 rounded-full bg-red-500 shadow-md -ml-0.5" />
                          <div className="flex-1 h-[1.5px] bg-red-500/50" />
                        </div>
                      );
                    })()}

                    {/* Parent blocks */}
                    {calendarActivities.filter((a) => isParent(a, activities)).map((activity) => (
                      <ParentBlockCard
                        key={activity.id} activity={activity}
                        children={getChildren(activity.id, activities)}
                        onCardClick={handleActivityClick}
                        onSwapActivities={handleSwapActivities}
                        onRemove={handleRemoveDirectly}
                        totalDays={totalDays}
                        expandedParents={expandedParents}
                        onToggleExpand={handleToggleExpand}
                        collaborators={collaborators}
                        isDimmed={selectedDay !== null && selectedDay !== activity.day}
                      />
                    ))}

                    {/* Regular cards */}
                    {calendarActivities.filter((a) => !isParent(a, activities)).map((activity) => (
                      <CalendarCard
                        key={activity.id} activity={activity}
                        onCardClick={handleActivityClick}
                        onSwapActivities={handleSwapActivities}
                        onRemove={handleRemoveDirectly}
                        totalDays={totalDays}
                        collaborators={collaborators}
                        isDimmed={selectedDay !== null && selectedDay !== activity.day}
                      />
                    ))}

                    {/* Notes */}
                    {notes.map((note) => {
                      const dayWidth = 100 / totalDays;
                      const notLeft = note.day * dayWidth;
                      const noteTop = (note.hour - 7) * HOUR_HEIGHT;
                      const isEditing = editingNoteId === note.id;
                      const isDimmedNote = selectedDay !== null && selectedDay !== note.day;
                      return (
                        <div
                          key={note.id}
                          className="absolute z-[4] rounded-lg shadow-sm overflow-hidden transition-opacity duration-200"
                          style={{
                            left: `${notLeft}%`,
                            width: `calc(${dayWidth}% - 8px)`,
                            top: `${noteTop}px`,
                            margin: '1px 4px',
                            minHeight: `${HOUR_HEIGHT}px`,
                            backgroundColor: note.color,
                            border: `1px solid ${note.color}`,
                            opacity: isDimmedNote ? 0.3 : 1,
                          }}
                        >
                          <div className="flex items-start gap-1 p-1.5">
                            <StickyNote size={10} className="text-gray-500/60 flex-shrink-0 mt-0.5" />
                            {isEditing ? (
                              <input
                                autoFocus
                                value={note.text}
                                onChange={(e) => handleUpdateNote(note.id, e.target.value)}
                                onBlur={() => {
                                  if (!note.text.trim()) handleDeleteNote(note.id);
                                  else setEditingNoteId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (!note.text.trim()) handleDeleteNote(note.id);
                                    else setEditingNoteId(null);
                                  }
                                  if (e.key === 'Escape') handleDeleteNote(note.id);
                                }}
                                placeholder="Type a note..."
                                className="flex-1 bg-transparent text-[11px] text-gray-700 outline-none placeholder:text-gray-400/60 min-w-0"
                              />
                            ) : (
                              <span
                                className="flex-1 text-[11px] text-gray-700 cursor-pointer truncate leading-tight"
                                onClick={() => setEditingNoteId(note.id)}
                              >
                                {note.text || 'Empty note'}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-0.5 rounded hover:bg-black/10 transition-colors cursor-pointer flex-shrink-0"
                            >
                              <X size={9} className="text-gray-500/60" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Detail Modal ───────────────────────────────────── */}
        <AnimatePresence>
          {selectedActivity && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedActivity(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative h-48 overflow-hidden rounded-t-2xl">
                  {selectedActivity.image ? (
                    <img src={selectedActivity.image} alt={selectedActivity.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: getConfig(selectedActivity.type).bgGradient }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                  <button onClick={() => setSelectedActivity(null)} className="absolute top-3 right-3 p-1.5 bg-white/90 hover:bg-white rounded-full transition-colors shadow-lg cursor-pointer">
                    <X size={14} />
                  </button>
                  <div className={`absolute top-3 left-3 ${getConfig(selectedActivity.type).bgColor} ${getConfig(selectedActivity.type).textColor} px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-lg`}>
                    {(() => { const I = getConfig(selectedActivity.type).icon; return <I size={11} />; })()}
                    {getConfig(selectedActivity.type).label}
                  </div>
                  {selectedActivity.rating && (
                    <div className="absolute bottom-3 left-3 bg-white/95 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                      <Star size={11} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-[12px] font-bold">{selectedActivity.rating}</span>
                    </div>
                  )}
                  {selectedActivity.price && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full text-[12px] font-bold text-white shadow-lg" style={{ background: NAVY }}>
                      {selectedActivity.price}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h2 className="text-lg font-bold mb-1" style={{ color: NAVY }}>{selectedActivity.title}</h2>
                  {selectedActivity.location && (
                    <div className="flex items-center gap-1.5 text-gray-500 mb-3 text-[13px]">
                      <MapPin size={13} />
                      <span>{selectedActivity.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] mb-4 w-fit" style={{ background: `${NAVY}08`, color: NAVY }}>
                    <Clock size={13} />
                    <span className="font-medium">{selectedActivity.startTime} – {selectedActivity.endTime}</span>
                  </div>

                  {isParent(selectedActivity, activities) && (
                    <div className="mb-4">
                      <h4 className="text-[13px] font-semibold mb-2" style={{ color: NAVY }}>Activities Inside</h4>
                      <div className="space-y-1.5">
                        {getChildren(selectedActivity.id, activities).map((child) => {
                          const cfg = getConfig(child.type);
                          const CIcon = cfg.icon;
                          return (
                            <div key={child.id} className="flex items-center gap-2 p-2 rounded-lg border-l-[3px]" style={{ borderColor: cfg.color, background: cfg.bgGradient }}>
                              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${cfg.dotColor}`}>
                                <CIcon size={9} className="text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-[12px] font-semibold ${cfg.textColor}`}>{child.title}</h4>
                                <span className="text-[10px] text-gray-400">{child.startTime} – {child.endTime}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    {selectedActivity.onCalendar ? (
                      <>
                        <button onClick={() => handleRemoveFromCalendar(selectedActivity.id)} className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                          <Trash2 size={13} /> Remove
                        </button>
                        <button className="px-3 py-2 border-2 hover:bg-gray-50 rounded-xl text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer" style={{ borderColor: NAVY, color: NAVY }}>
                          <Edit2 size={13} /> Edit
                        </button>
                      </>
                    ) : (
                      <button className="flex-1 px-3 py-2 text-white rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-md" style={{ background: NAVY }}>
                        <Plus size={13} /> Add to Calendar
                      </button>
                    )}
                    <button className="px-3 py-2 border border-gray-200 hover:bg-red-50 rounded-xl transition-colors cursor-pointer">
                      <Heart size={13} className="text-red-500" />
                    </button>
                    <button className="px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                      <ExternalLink size={13} className="text-gray-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}
