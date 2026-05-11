// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayPipPager } from '../DayPipPager';

afterEach(() => cleanup());

describe('DayPipPager', () => {
  it('marks the active pip and lights up days that have activities', () => {
    render(
      <DayPipPager
        activeIndex={1}
        activityCounts={[2, 0, 4, 0, 0]}
        onSelect={() => {}}
      />
    );
    const pips = screen.getAllByRole('button');
    expect(pips).toHaveLength(5);
    expect(pips[1].getAttribute('aria-current')).toBe('true');
    expect(pips[0].className).toMatch(/has-data/);
    expect(pips[2].className).toMatch(/has-data/);
  });

  it('calls onSelect with the clicked index', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<DayPipPager activeIndex={0} activityCounts={[0,0,0]} onSelect={onSelect} />);
    const pips = screen.getAllByRole('button');
    await user.click(pips[2]);
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});
