'use client'

import {
  Home, Compass, MapPin, Info, Newspaper, Download,
  LogIn, UserPlus, Shield, FileText, Luggage, User, Settings,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Compass, MapPin, Info, Newspaper, Download,
  LogIn, UserPlus, Shield, FileText, Luggage, User, Settings,
}

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MapPin
}
