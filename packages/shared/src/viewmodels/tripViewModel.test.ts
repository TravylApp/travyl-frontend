import { describe, it, expect } from 'vitest';
import {
  getTripStatusDisplay,
  getTripDateRange,
  getTravelersLabel,
  getTripBudgetDisplay,
  buildTripCardViewModel,
} from './tripViewModel';
import type { Trip } from '../types';

// ─── getTripStatusDisplay ────────────────────────────────────────────

describe('getTripStatusDisplay', () => {
  it('returns correct colors for planning', () => {
    const result = getTripStatusDisplay('planning');
    expect(result.label).toBe('Planning');
    expect(result.bgColor).toBe('#DBEAFE');
    expect(result.textColor).toBe('#1D4ED8');
  });

  it('returns correct colors for booked', () => {
    const result = getTripStatusDisplay('booked');
    expect(result.label).toBe('Booked');
    expect(result.bgColor).toBe('#FEF3C7');
  });

  it('returns correct colors for active', () => {
    const result = getTripStatusDisplay('active');
    expect(result.label).toBe('Active');
    expect(result.bgColor).toBe('#DCFCE7');
  });

  it('returns correct colors for completed', () => {
    const result = getTripStatusDisplay('completed');
    expect(result.label).toBe('Completed');
    expect(result.bgColor).toBe('#F3F4F6');
  });

  it('returns correct colors for abandoned', () => {
    const result = getTripStatusDisplay('abandoned');
    expect(result.label).toBe('Abandoned');
    expect(result.bgColor).toBe('#FEE2E2');
  });
});

// ─── getTripDateRange ────────────────────────────────────────────────

describe('getTripDateRange', () => {
  it('calculates nights correctly for a 7-day trip', () => {
    const result = getTripDateRange({
      start_date: '2026-03-10',
      end_date: '2026-03-17',
    });
    expect(result.nights).toBe(7);
    expect(result.nightsLabel).toBe('7 nights');
  });

  it('returns singular label for 1 night', () => {
    const result = getTripDateRange({
      start_date: '2026-06-01',
      end_date: '2026-06-02',
    });
    expect(result.nights).toBe(1);
    expect(result.nightsLabel).toBe('1 night');
  });

  it('returns 0 nights for same-day trip', () => {
    const result = getTripDateRange({
      start_date: '2026-06-01',
      end_date: '2026-06-01',
    });
    expect(result.nights).toBe(0);
    expect(result.nightsLabel).toBe('0 nights');
  });

  it('short format has "Mon D - Mon D" structure', () => {
    const result = getTripDateRange({
      start_date: '2026-03-10T00:00:00',
      end_date: '2026-03-17T00:00:00',
    });
    expect(result.short).toMatch(/\w{3} \d{1,2} - \w{3} \d{1,2}/);
  });

  it('full format includes year', () => {
    const result = getTripDateRange({
      start_date: '2026-03-10T00:00:00',
      end_date: '2026-03-17T00:00:00',
    });
    expect(result.full).toContain('2026');
  });
});

// ─── getTravelersLabel ───────────────────────────────────────────────

describe('getTravelersLabel', () => {
  it('returns "No travelers" for 0', () => {
    expect(getTravelersLabel(0)).toBe('No travelers');
  });

  it('returns singular for 1', () => {
    expect(getTravelersLabel(1)).toBe('1 traveler');
  });

  it('returns plural for 2+', () => {
    expect(getTravelersLabel(2)).toBe('2 travelers');
    expect(getTravelersLabel(5)).toBe('5 travelers');
  });

  it('handles negative as no travelers', () => {
    expect(getTravelersLabel(-1)).toBe('No travelers');
  });
});

// ─── getTripBudgetDisplay ────────────────────────────────────────────

describe('getTripBudgetDisplay', () => {
  it('returns formatted currency when budget exists', () => {
    const result = getTripBudgetDisplay(5000, 'USD');
    expect(result.hasBudget).toBe(true);
    expect(result.formatted).toContain('5,000');
    expect(result.formatted).toContain('$');
  });

  it('returns "No budget set" when null', () => {
    const result = getTripBudgetDisplay(null, 'USD');
    expect(result.hasBudget).toBe(false);
    expect(result.formatted).toBe('No budget set');
  });

  it('returns "No budget set" when 0', () => {
    const result = getTripBudgetDisplay(0, 'USD');
    expect(result.hasBudget).toBe(false);
  });

  it('supports EUR currency', () => {
    const result = getTripBudgetDisplay(3000, 'EUR');
    expect(result.hasBudget).toBe(true);
    expect(result.formatted).toContain('3,000');
  });
});

// ─── buildTripCardViewModel ──────────────────────────────────────────

describe('buildTripCardViewModel', () => {
  const mockTrip: Trip = {
    id: 'trip-1',
    user_id: 'user-1',
    title: 'Rome Adventure',
    destination: 'Rome, Italy',
    start_date: '2026-06-15',
    end_date: '2026-06-22',
    budget: 4000,
    currency: 'USD',
    travelers: 2,
    status: 'booked',
    trip_context: {},
    is_generated: true,
    is_shared: false,
    share_link_token: null,
    share_link_role: 'viewer',
    forked_from_trip_id: null,
    fork_count: 0,
    is_public: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('assembles all fields correctly', () => {
    const vm = buildTripCardViewModel(mockTrip);
    expect(vm.title).toBe('Rome Adventure');
    expect(vm.destination).toBe('Rome, Italy');
    expect(vm.status.label).toBe('Booked');
    expect(vm.dateRange.nights).toBe(7);
    expect(vm.travelersLabel).toBe('2 travelers');
    expect(vm.budget.hasBudget).toBe(true);
    expect(vm.isShared).toBe(false);
  });
});
