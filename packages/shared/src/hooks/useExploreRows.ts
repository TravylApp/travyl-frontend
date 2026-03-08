import { useState, useCallback, useMemo } from 'react';
import { getCyclicGradient } from '../config/homeData';
import { useExploreData } from './useExploreData';

export function useExploreRows() {
  const { data: rawRows, isLoading } = useExploreData();
  const rows_data = rawRows ?? [];

  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Default all rows to collapsed
  const effectiveExpanded = useMemo(() => {
    if (Object.keys(expandedRows).length > 0) return expandedRows;
    return Object.fromEntries(rows_data.map((_, i) => [i, false]));
  }, [expandedRows, rows_data]);

  const toggleRow = useCallback((index: number) => {
    setExpandedRows((prev) => {
      const current = prev[index] ?? false;
      return { ...prev, [index]: !current };
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedRows(Object.fromEntries(rows_data.map((_, i) => [i, false])));
  }, [rows_data]);

  const expandAll = useCallback(() => {
    setExpandedRows(Object.fromEntries(rows_data.map((_, i) => [i, true])));
  }, [rows_data]);

  const rows = rows_data.map((row, i) => ({
    title: row.title,
    items: row.items,
    gradient: getCyclicGradient(i),
    isExpanded: effectiveExpanded[i] ?? false,
  }));

  const allExpanded = useMemo(
    () => rows_data.length > 0 && rows_data.every((_, i) => effectiveExpanded[i] ?? false),
    [effectiveExpanded, rows_data],
  );

  return { rows, toggleRow, collapseAll, expandAll, allExpanded, isLoading };
}
