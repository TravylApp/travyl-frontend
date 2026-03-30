"use client"
import { useState, useCallback, useMemo } from 'react';
import { getCyclicGradient } from '../config/homeData';
import { useExploreData } from './useExploreData';
import type { PlaceItem } from '../types';

const FALLBACK_ROWS: { title: string; items: PlaceItem[] }[] = [];

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
