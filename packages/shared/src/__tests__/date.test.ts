import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDateISO, addDays, getDaysBetween, getPreviousPeriod, getRangeFromPreset } from '../utils/date';

describe('formatDateISO', () => {
  it('formats a Date object to ISO date string', () => {
    const date = new Date('2024-03-15T12:00:00Z');
    expect(formatDateISO(date)).toBe('2024-03-15');
  });

  it('formats a string date input', () => {
    expect(formatDateISO('2024-01-01T00:00:00Z')).toBe('2024-01-01');
  });

  it('formats a numeric timestamp', () => {
    // 2024-06-15T00:00:00.000Z
    const ts = new Date('2024-06-15T00:00:00Z').getTime();
    expect(formatDateISO(ts)).toBe('2024-06-15');
  });

  it('strips the time portion from a datetime string', () => {
    expect(formatDateISO('2023-12-25T23:59:59.999Z')).toBe('2023-12-25');
  });

  it('handles dates at the start of a year', () => {
    expect(formatDateISO(new Date('2025-01-01T00:00:00Z'))).toBe('2025-01-01');
  });
});

describe('addDays', () => {
  it('adds positive days to a date', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const result = addDays(date, 10);
    expect(result.toISOString().split('T')[0]).toBe('2024-01-11');
  });

  it('subtracts days when given a negative number', () => {
    const date = new Date('2024-01-15T00:00:00Z');
    const result = addDays(date, -5);
    expect(result.toISOString().split('T')[0]).toBe('2024-01-10');
  });

  it('returns the same date when adding 0 days', () => {
    const date = new Date('2024-06-15T00:00:00Z');
    const result = addDays(date, 0);
    expect(result.toISOString().split('T')[0]).toBe('2024-06-15');
  });

  it('crosses month boundaries correctly', () => {
    const date = new Date('2024-01-30T00:00:00Z');
    const result = addDays(date, 5);
    expect(result.toISOString().split('T')[0]).toBe('2024-02-04');
  });

  it('handles leap year crossing', () => {
    const date = new Date('2024-02-28T00:00:00Z');
    const result = addDays(date, 1);
    expect(result.toISOString().split('T')[0]).toBe('2024-02-29');
  });

  it('does not mutate the original date', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const original = date.getTime();
    addDays(date, 10);
    expect(date.getTime()).toBe(original);
  });
});

describe('getDaysBetween', () => {
  it('returns 0 for the same date', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    expect(getDaysBetween(date, date)).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-02T00:00:00Z');
    expect(getDaysBetween(start, end)).toBe(1);
  });

  it('returns the correct number for a known range', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-31T00:00:00Z');
    expect(getDaysBetween(start, end)).toBe(30);
  });

  it('returns a negative value when end is before start (Math.ceil behavior)', () => {
    const start = new Date('2024-01-10T00:00:00Z');
    const end = new Date('2024-01-01T00:00:00Z');
    // diff is negative, Math.ceil(-9) = -9
    expect(getDaysBetween(start, end)).toBe(-9);
  });

  it('uses Math.ceil for partial days', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-01T12:00:00Z'); // half a day
    expect(getDaysBetween(start, end)).toBe(1);
  });

  it('handles year-spanning ranges', () => {
    const start = new Date('2023-12-31T00:00:00Z');
    const end = new Date('2024-01-01T00:00:00Z');
    expect(getDaysBetween(start, end)).toBe(1);
  });
});

describe('getPreviousPeriod', () => {
  it('returns the previous period of equal duration', () => {
    const start = new Date('2024-01-11T00:00:00Z');
    const end = new Date('2024-01-21T00:00:00Z');
    const prev = getPreviousPeriod(start, end);

    // duration = 10 days
    expect(prev.start.toISOString().split('T')[0]).toBe('2024-01-01');
    expect(prev.end.toISOString().split('T')[0]).toBe('2024-01-11');
  });

  it('returns a previous period that ends at the original start', () => {
    const start = new Date('2024-03-01T00:00:00Z');
    const end = new Date('2024-03-15T00:00:00Z');
    const prev = getPreviousPeriod(start, end);

    expect(prev.end.getTime()).toBe(start.getTime());
  });

  it('handles a single-day period', () => {
    const start = new Date('2024-06-15T00:00:00Z');
    const end = new Date('2024-06-15T00:00:00Z');
    const prev = getPreviousPeriod(start, end);

    // duration is 0, so prev period should be the same dates
    expect(prev.start.getTime()).toBe(start.getTime());
    expect(prev.end.getTime()).toBe(end.getTime());
  });

  it('works for a 7-day period', () => {
    const start = new Date('2024-01-08T00:00:00Z');
    const end = new Date('2024-01-15T00:00:00Z');
    const prev = getPreviousPeriod(start, end);

    expect(prev.start.toISOString().split('T')[0]).toBe('2024-01-01');
    expect(prev.end.toISOString().split('T')[0]).toBe('2024-01-08');
  });
});

describe('getRangeFromPreset', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a 7-day range for "last_7d"', () => {
    const { start, end } = getRangeFromPreset('last_7d');
    expect(getDaysBetween(start, end)).toBe(7);
  });

  it('returns a 28-day range for "last_28d"', () => {
    const { start, end } = getRangeFromPreset('last_28d');
    expect(getDaysBetween(start, end)).toBe(28);
  });

  it('returns a 90-day range for "last_90d"', () => {
    const { start, end } = getRangeFromPreset('last_90d');
    expect(getDaysBetween(start, end)).toBe(90);
  });

  it('returns a 365-day range for "last_365d"', () => {
    const { start, end } = getRangeFromPreset('last_365d');
    expect(getDaysBetween(start, end)).toBe(365);
  });

  it('defaults to 28 days for an unknown preset', () => {
    const { start, end } = getRangeFromPreset('unknown_preset');
    expect(getDaysBetween(start, end)).toBe(28);
  });

  it('defaults to 28 days for an empty string', () => {
    const { start, end } = getRangeFromPreset('');
    expect(getDaysBetween(start, end)).toBe(28);
  });

  it('sets end to the current time', () => {
    const { end } = getRangeFromPreset('last_7d');
    const now = new Date('2024-06-15T12:00:00Z');
    expect(end.getTime()).toBe(now.getTime());
  });
});
