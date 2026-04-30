/**
 * @module useExploreRows
 * Builds the view-ready row data for the Explore section by combining place data
 * from `useExploreData` with gradient assignments and per-row expand/collapse state.
 * Exposes `toggleRow`, `collapseAll`, and `expandAll` helpers so UI components
 * do not need to manage row state themselves.
 * Used by the web ExplorePage and mobile ExploreTab.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { getCyclicGradient } from '../config/homeData';
import { useExploreData } from './useExploreData';
import type { PlaceItem } from '../types';

const FALLBACK_ROWS: { title: string; items: PlaceItem[] }[] = [];

/**
 * Provides view-ready rows for the Explore section with expand/collapse state.
 * Falls back to an empty row list while data is loading or unavailable.
 * Each row is decorated with:
 * - `gradient`: a cyclic gradient token from `getCyclicGradient`
 * - `isExpanded`: current expanded state for this row index
 *
 * @returns Object containing:
 *   - `rows` — decorated rows ready for rendering
 *   - `toggleRow(index)` — toggles the expanded state of a single row
 *   - `collapseAll()` — collapses every row
 *   - `expandAll()` — expands every row
 *   - `allExpanded` — `true` when every row is currently expanded
 *   - `isLoading` — `true` while the underlying data fetch is in progress
 * @example
 * ```tsx
 * const { rows, toggleRow, allExpanded } = useExploreRows();
 * return rows.map((row, i) => (
 *   <ExploreRow key={i} row={row} onToggle={() => toggleRow(i)} />
 * ));
 * ```
 */
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
