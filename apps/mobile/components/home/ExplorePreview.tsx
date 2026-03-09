import { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useExploreRows, Gray, getCyclicGradient } from '@travyl/shared';
import type { ExploreItem } from '@travyl/shared';
import { ExploreRow } from './ExploreRow';

/** Double-chevron icon to match web's ChevronsUpDown / ChevronsDownUp */
function DoubleChevron({ collapsed, size = 10, color = Gray[500] }: { collapsed: boolean; size?: number; color?: string }) {
  const half = size * 0.55;
  return (
    <View style={{ height: size, justifyContent: 'center', alignItems: 'center' }}>
      <FontAwesome
        name={collapsed ? 'chevron-up' : 'chevron-down'}
        size={half}
        color={color}
        style={{ marginBottom: collapsed ? -1 : 1 }}
      />
      <FontAwesome
        name={collapsed ? 'chevron-down' : 'chevron-up'}
        size={half}
        color={color}
        style={{ marginTop: collapsed ? -1 : 1 }}
      />
    </View>
  );
}

const PLACEHOLDER_ITEMS: ExploreItem[] = [
  { id: 'pe-1', name: '', image_url: null },
  { id: 'pe-2', name: '', image_url: null },
  { id: 'pe-3', name: '', image_url: null },
  { id: 'pe-4', name: '', image_url: null },
];

const PLACEHOLDER_BASE = [
  { title: 'Popular Destinations', items: PLACEHOLDER_ITEMS, gradient: getCyclicGradient(0) },
  { title: 'Famous Attractions', items: PLACEHOLDER_ITEMS.map((it, i) => ({ ...it, id: `pe-${i + 5}` })), gradient: getCyclicGradient(1) },
  { title: 'Top Restaurants', items: PLACEHOLDER_ITEMS.map((it, i) => ({ ...it, id: `pe-${i + 9}` })), gradient: getCyclicGradient(2) },
  { title: 'Hot Experiences', items: PLACEHOLDER_ITEMS.map((it, i) => ({ ...it, id: `pe-${i + 13}` })), gradient: getCyclicGradient(3) },
];

export function ExplorePreview() {
  const { rows: hookRows, toggleRow: hookToggle, collapseAll: hookCollapseAll, expandAll: hookExpandAll, allExpanded: hookAllExpanded } = useExploreRows();
  const usingPlaceholder = !hookRows.length;

  // Local expand state for placeholder mode — all collapsed by default
  const [localExpanded, setLocalExpanded] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false, 3: false });

  const localToggle = useCallback((i: number) => {
    setLocalExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  }, []);
  const localCollapseAll = useCallback(() => {
    setLocalExpanded({ 0: false, 1: false, 2: false, 3: false });
  }, []);
  const localExpandAll = useCallback(() => {
    setLocalExpanded({ 0: true, 1: true, 2: true, 3: true });
  }, []);

  const rows = usingPlaceholder
    ? PLACEHOLDER_BASE.map((r, i) => ({ ...r, isExpanded: localExpanded[i] ?? false }))
    : hookRows;
  const toggleRow = usingPlaceholder ? localToggle : hookToggle;
  const collapseAll = usingPlaceholder ? localCollapseAll : hookCollapseAll;
  const expandAll = usingPlaceholder ? localExpandAll : hookExpandAll;
  const allExpanded = usingPlaceholder
    ? Object.values(localExpanded).every(Boolean)
    : hookAllExpanded;

  return (
    <View style={{ paddingVertical: 40 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: Gray[900],
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Explore
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Gray[500],
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Discover destinations, attractions, restaurants, and experiences
        </Text>

        {/* Expand/Collapse All pill */}
        <Pressable
          onPress={allExpanded ? collapseAll : expandAll}
          style={{
            alignSelf: 'flex-end',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: Gray[300],
            backgroundColor: '#fff',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: Gray[800] }}>
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Text>
          <DoubleChevron collapsed={allExpanded} size={12} color={Gray[500]} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 24, gap: 10 }}>
        {rows.map((row, rowIndex) => (
          <ExploreRow
            key={row.title}
            row={row}
            rowIndex={rowIndex}
            onToggle={() => toggleRow(rowIndex)}
          />
        ))}
      </View>
    </View>
  );
}
