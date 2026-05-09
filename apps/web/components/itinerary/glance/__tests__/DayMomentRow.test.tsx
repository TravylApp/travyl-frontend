// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DayMomentRow } from '../DayMomentRow';

afterEach(() => cleanup());

describe('DayMomentRow', () => {
  it('renders a calendar deep-link to the activity when an id is provided', () => {
    render(
      <DayMomentRow
        tripId="t1"
        when="2:30 PM"
        title="Arrive IBZ"
        activityId="a1"
      />
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/trip/t1/calendar?activity=a1');
  });

  it('renders an empty-slot link when no activityId, with day+slot params', () => {
    render(
      <DayMomentRow
        tripId="t1"
        when="Evening"
        title="+ Add sunset & dinner"
        empty
        dayIndex={0}
        slot="evening"
      />
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/trip/t1/calendar?day=0&slot=evening');
  });
});
