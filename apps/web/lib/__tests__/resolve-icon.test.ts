import { describe, it, expect } from 'vitest'
import { resolveIcon } from '../resolve-icon'
import { MapPin } from 'lucide-react'

describe('resolveIcon', () => {
  it('returns an icon component for known names', () => {
    const icon = resolveIcon('Home')
    expect(icon).toBeDefined()
  })

  it('returns MapPin for unknown names', () => {
    const icon = resolveIcon('NonExistent')
    expect(icon).toBe(MapPin)
  })
})
