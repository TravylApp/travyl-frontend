'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { ItineraryDayViewModel } from '@travyl/shared';
import { MapPin, Plane, Hotel, Utensils, Camera, Compass, ShoppingBag, Music, TreePine, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface TripCanvasViewProps {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
  onActivityClick: (activityId: string) => void;
}

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: typeof Camera; color: string; bgColor: string }> = {
  sightseeing: { icon: Camera, color: '#0d9488', bgColor: '#0d948810' },
  tour: { icon: Compass, color: '#8b5cf6', bgColor: '#8b5cf615' },
  dining: { icon: Utensils, color: '#ea580c', bgColor: '#ea580c15' },
  cultural: { icon: Music, color: '#6366f1', bgColor: '#6366f115' },
  shopping: { icon: ShoppingBag, color: '#ec4899', bgColor: '#ec489915' },
  nightlife: { icon: Music, color: '#7c3aed', bgColor: '#7c3aed15' },
  outdoor: { icon: TreePine, color: '#16a34a', bgColor: '#16a34a15' },
  museum: { icon: Camera, color: '#2563eb', bgColor: '#2563eb15' },
  hotel: { icon: Hotel, color: '#0891b2', bgColor: '#0891b215' },
  transport: { icon: Plane, color: '#64748b', bgColor: '#64748b15' },
};

// Mock coordinates for nodes (Paris trip)
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  'day-1': { x: 150, y: 120 },
  'day-2': { x: 350, y: 200 },
  'day-3': { x: 550, y: 280 },
  'day-4': { x: 350, y: 360 },
  'day-5': { x: 150, y: 440 },
};

// Connections between nodes
const NODE_CONNECTIONS: [string, string][] = [
  ['day-1', 'day-2'],
  ['day-2', 'day-3'],
  ['day-3', 'day-4'],
  ['day-4', 'day-5'],
];

export const TripCanvasView = memo(function TripCanvasView({
  days,
  selectedDayIndex,
  onSelectDay,
  onActivityClick,
}: TripCanvasViewProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Build node data
  const nodes = useMemo(() => {
    return days.map((day, index) => {
      const activities = day.timeGroups.flatMap(g => g.activities);
      const categories = [...new Set(activities.map(a => a.category))];
      const pos = NODE_POSITIONS[`day-${index + 1}`] || { x: 100 + index * 120, y: 100 + index * 80 };

      return {
        id: `day-${index + 1}`,
        day,
        index,
        position: pos,
        activities,
        categories,
        activityCount: activities.length,
      };
    });
  }, [days]);

  // Build connections
  const connections = useMemo(() => {
    return NODE_CONNECTIONS.map(([from, to]) => {
      const fromNode = nodes.find(n => n.id === from);
      const toNode = nodes.find(n => n.id === to);
      if (!fromNode || !toNode) return null;

      return {
        from: fromNode.position,
        to: toNode.position,
      };
    }).filter(Boolean);
  }, [nodes]);

  const handleNodeClick = useCallback((index: number) => {
    onSelectDay(index);
  }, [onSelectDay]);

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Container */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Connections (SVG lines) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn, i) => {
            if (!conn) return null;
            const midX = (conn.from.x + conn.to.x) / 2;
            const midY = (conn.from.y + conn.to.y) / 2;
            const controlPoint1X = conn.from.x;
            const controlPoint1Y = midY;
            const controlPoint2X = conn.to.x;
            const controlPoint2Y = midY;

            return (
              <motion.path
                key={i}
                d={`M ${conn.from.x} ${conn.from.y} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${conn.to.x} ${conn.to.y}`}
                fill="none"
                stroke="#1e3a5f"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            );
          })}
        </svg>

        {/* Node Cards */}
        <AnimatePresence>
          {nodes.map((node) => {
            const isSelected = node.index === selectedDayIndex;
            const isHovered = hoveredNode === node.id;
            const primaryCategory = node.categories[0] || 'sightseeing';
            const config = CATEGORY_CONFIG[primaryCategory] || CATEGORY_CONFIG.sightseeing;
            const Icon = config.icon;

            return (
              <motion.div
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: isSelected ? 1.05 : isHovered ? 1.02 : 1,
                  opacity: 1
                }}
                whileHover={{ scale: 1.02 }}
                onHoverStart={() => setHoveredNode(node.id)}
                onHoverEnd={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node.index)}
                className="absolute cursor-pointer"
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  width: 140,
                  zIndex: isSelected ? 20 : isHovered ? 15 : 10,
                }}
              >
                <div
                  className={`rounded-2xl overflow-hidden transition-all ${
                    isSelected ? 'shadow-xl ring-2 ring-[#1e3a5f]' : 'shadow-lg'
                  }`}
                  style={{ backgroundColor: 'white' }}
                >
                  {/* Header with gradient */}
                  <div
                    className="h-20 rounded-t-2xl flex items-center justify-center"
                    style={{ backgroundColor: config.color }}
                  >
                    <Icon size={20} className="text-white" />
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-gray-900">
                        {node.day.dayLabel}
                      </span>
                      <span className="text-[9px] font-medium text-gray-400">
                        {node.activityCount}
                      </span>
                    </div>
                    <p className="text-[12px] font-medium text-gray-700 mb-2">
                      {node.day.dateLabel}
                    </p>

                    {/* Category dots */}
                    <div className="flex gap-1 flex-wrap">
                      {node.categories.slice(0, 4).map((cat) => {
                        const catConfig = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.sightseeing;
                        return (
                          <div
                            key={cat}
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: catConfig.color }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#1e3a5f]" />
            <span className="text-[10px] text-gray-500">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            {Object.entries(CATEGORY_CONFIG).slice(0, 4).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-[9px] text-gray-400 capitalize">{key}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
