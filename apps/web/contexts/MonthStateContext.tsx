'use client';

import { createContext, useContext, useState } from 'react';

interface MonthState {
  year: number;
  month: number; // 0-indexed (Jan = 0)
}

interface MonthStateContextValue {
  monthState: MonthState;
  prevMonth: () => void;
  nextMonth: () => void;
  goToToday: () => void;
}

const MonthStateContext = createContext<MonthStateContextValue | null>(null);

export function MonthStateProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [monthState, setMonthState] = useState<MonthState>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  function prevMonth() {
    setMonthState(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  }

  function nextMonth() {
    setMonthState(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );
  }

  function goToToday() {
    const n = new Date();
    setMonthState({ year: n.getFullYear(), month: n.getMonth() });
  }

  return (
    <MonthStateContext.Provider value={{ monthState, prevMonth, nextMonth, goToToday }}>
      {children}
    </MonthStateContext.Provider>
  );
}

export function useMonthState(): MonthStateContextValue {
  const ctx = useContext(MonthStateContext);
  if (!ctx) throw new Error('useMonthState must be used within MonthStateProvider');
  return ctx;
}
