import { describe, expect, it } from 'vitest';
import { formatClockTime, formatPreciseTime, formatTime, parseTime } from '../time';

describe('time formatting', () => {
  it('formats mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(75.9)).toBe('01:15');
    expect(formatTime(NaN)).toBe('00:00');
  });

  it('formats centiseconds without rounding drift', () => {
    expect(formatPreciseTime(75.4)).toBe('01:15.40');
    expect(formatPreciseTime(59.999)).toBe('01:00.00');
    expect(formatPreciseTime(0.07)).toBe('00:00.07');
  });

  it('formats SRT and VTT clock times', () => {
    expect(formatClockTime(3725.5, ',')).toBe('01:02:05,500');
    expect(formatClockTime(1.234, '.')).toBe('00:00:01.234');
  });
});

describe('parseTime', () => {
  it.each([
    ['12', 12],
    ['1:15', 75],
    ['01:15.40', 75.4],
    ['1:02:05,5', 3725.5],
  ])('parses %s', (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it.each(['', 'abc', '1:', '-1', '1:2:3:4'])('rejects %s', (input) => {
    expect(parseTime(input)).toBeNull();
  });

  it('round-trips with formatPreciseTime', () => {
    for (const t of [0, 3.14, 61.07, 599.99]) {
      expect(parseTime(formatPreciseTime(t))).toBeCloseTo(t, 2);
    }
  });
});
