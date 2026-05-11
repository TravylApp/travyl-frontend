import React from 'react';
import { Train, Bus, Ship, CableCar } from 'lucide-react';

export const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  train: <Train size={16} />,
  bus: <Bus size={16} />,
  subway: <Train size={16} />,
  tram: <Train size={16} />,
  light_rail: <Train size={16} />,
  ferry: <Ship size={16} />,
  cable_car: <CableCar size={16} />,
  funicular: <CableCar size={16} />,
};

export const VEHICLE_COLORS: Record<string, string> = {
  train: '#10B981',
  bus: '#F59E0B',
  subway: '#3B82F6',
  tram: '#8B5CF6',
  light_rail: '#8B5CF6',
  ferry: '#06B6D4',
  cable_car: '#EC4899',
  funicular: '#EC4899',
};
