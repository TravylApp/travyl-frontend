'use client';

import { createContext, useContext, useState } from 'react';

function getWeekStart(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay()); // back to Sunday
  return result;
}

interface WeekStateContextValue {
  weekStart: Date;
  prevWeek: () => void;
  nextWeek: () => void;
  goToToday: () => void;
}

const WeekStateContext = createContext<WeekStateContextValue | null>(null);

export function WeekStateProvider({ children }: { children: React.ReactNode }) {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  function prevWeek() {
    setWeekStart((ws) => {
      const d = new Date(ws);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart((ws) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function goToToday() {
    setWeekStart(getWeekStart(new Date()));
  }

  return (
    <WeekStateContext.Provider value={{ weekStart, prevWeek, nextWeek, goToToday }}>
      {children}
    </WeekStateContext.Provider>
  );
}

export function useWeekState(): WeekStateContextValue {
  const ctx = useContext(WeekStateContext);
  if (!ctx) throw new Error('useWeekState must be used within WeekStateProvider');
  return ctx;
}
