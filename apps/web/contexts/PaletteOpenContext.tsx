'use client';

import { createContext, useContext, useState } from 'react';

interface PaletteOpenContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const PaletteOpenContext = createContext<PaletteOpenContextValue | null>(null);

export function PaletteOpenProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <PaletteOpenContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </PaletteOpenContext.Provider>
  );
}

export function usePaletteOpen(): PaletteOpenContextValue {
  const ctx = useContext(PaletteOpenContext);
  if (!ctx) throw new Error('usePaletteOpen must be used within PaletteOpenProvider');
  return ctx;
}
