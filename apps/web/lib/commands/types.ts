export interface GlobalCommand {
  id: string
  label: string
  description: string
  group: 'navigation' | 'action' | 'page-action' | 'settings'
  icon?: string
  shortcut?: { key: string; meta?: boolean; shift?: boolean; display: string }
  chord?: string
  isEnabled: boolean
  execute: () => void
}
