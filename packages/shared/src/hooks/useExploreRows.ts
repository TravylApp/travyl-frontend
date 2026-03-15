import { useState, useCallback, useMemo } from 'react';
import { getCyclicGradient } from '../config/homeData';
import { useExploreData } from './useExploreData';
import { MOCK_PLACES } from '../config/mockPlacesData';
import type { PlaceItem } from '../types';

// Group MOCK_PLACES by type for fallback rows
const FALLBACK_ROWS = [
  { title: 'Popular Destinations', items: MOCK_PLACES.filter(p => p.type === 'destination').slice(0, 8) },
  { title: 'Famous Attractions', items: MOCK_PLACES.filter(p => p.type === 'attraction').slice(0, 8) },
  { title: 'Top Restaurants', items: MOCK_PLACES.filter(p => p.type === 'restaurant').slice(0, 8) },
  { title: 'Hot Experiences', items: MOCK_PLACES.filter(p => p.type === 'experience').slice(0, 8) },
  { title: 'Upcoming Events', items: MOCK_PLACES.filter(p => p.type === 'event').slice(0, 8) },
];

export function useExploreRows() {
  const { data: rawRows, isLoading } = useExploreData();
  const hasApiData = (rawRows ?? []).length > 0;

  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const sourceRows = hasApiData ? rawRows! : FALLBACK_ROWS;

  const effectiveExpanded = useMemo(() => {
    if (Object.keys(expandedRows).length > 0) return expandedRows;
    return Object.fromEntries(sourceRows.map((_, i) => [i, false]));
  }, [expandedRows, sourceRows]);

  const toggleRow = useCallback((index: number) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !(prev[index] ?? false) }));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedRows(Object.fromEntries(sourceRows.map((_, i) => [i, false])));
  }, [sourceRows]);

  const expandAll = useCallback(() => {
    setExpandedRows(Object.fromEntries(sourceRows.map((_, i) => [i, true])));
  }, [sourceRows]);

  const rows = sourceRows.map((row, i) => ({
    title: row.title,
    items: row.items as PlaceItem[],
    gradient: getCyclicGradient(i),
    isExpanded: effectiveExpanded[i] ?? false,
  }));

  const allExpanded = useMemo(
    () => sourceRows.length > 0 && sourceRows.every((_, i) => effectiveExpanded[i] ?? false),
    [effectiveExpanded, sourceRows],
  );

  return { rows, toggleRow, collapseAll, expandAll, allExpanded, isLoading };
}
