import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useExploreRows, Gray, getCyclicGradient, MOCK_PLACES } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
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

export function ExplorePreview({ contextPlace }: { contextPlace?: PlaceItem } = {}) {
  const { rows: hookRows, toggleRow: hookToggle, collapseAll: hookCollapseAll, expandAll: hookExpandAll, allExpanded: hookAllExpanded } = useExploreRows();

  // Build contextual rows when a place is selected
  const contextRows = useMemo(() => {
    if (!contextPlace) return null;
    const nearbyIds = contextPlace.nearbyPlaces ?? [];
    const nearbyItems = MOCK_PLACES.filter((p) => nearbyIds.includes(p.id));
    const similarItems = MOCK_PLACES.filter(
      (p) => p.id !== contextPlace.id && p.type === contextPlace.type,
    ).slice(0, 6);

    return [
      ...(nearbyItems.length > 0
        ? [{ title: 'Nearby Places', items: nearbyItems, gradient: getCyclicGradient(0) }]
        : []),
      ...(similarItems.length > 0
        ? [{ title: `Similar ${contextPlace.type.charAt(0).toUpperCase() + contextPlace.type.slice(1)}s`, items: similarItems, gradient: getCyclicGradient(1) }]
        : []),
    ];
  }, [contextPlace?.id]);

  // Local expand state for context mode — all collapsed by default
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

  const rows = contextRows
    ? contextRows.map((r, i) => ({ ...r, isExpanded: localExpanded[i] ?? false }))
    : hookRows;
  const toggleRow = contextRows ? localToggle : hookToggle;
  const collapseAll = contextRows ? localCollapseAll : hookCollapseAll;
  const expandAll = contextRows ? localExpandAll : hookExpandAll;
  const allExpanded = contextRows
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
            textAlign: 'left',
            marginBottom: 8,
          }}
        >
          {contextPlace ? 'More to Explore' : 'Explore'}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Gray[500],
            textAlign: 'left',
            marginBottom: 16,
          }}
        >
          {contextPlace
            ? `Nearby and similar to ${contextPlace.name}`
            : 'Discover destinations, attractions, restaurants, and experiences'}
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
