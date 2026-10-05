import { describe, expect, it } from 'vitest';
import { phoneticKey } from '../phonetic';

describe('phoneticKey', () => {
  it.each([
    ['ground', 'grand'],
    ['night', 'nite'],
    ['phone', 'fone'],
    ['knight', 'night'],
    ['through', 'thru'],
    ['cents', 'sense'],
  ])('%s sounds like %s', (a, b) => {
    expect(phoneticKey(a)).toBe(phoneticKey(b));
  });

  it('keeps different-sounding words apart', () => {
    expect(phoneticKey('love')).not.toBe(phoneticKey('lie'));
    expect(phoneticKey('heart')).not.toBe(phoneticKey('car'));
  });

  it('handles empty and non-Latin input', () => {
    expect(phoneticKey('')).toBe('');
    expect(phoneticKey('こんにちは')).toBe('');
  });
});
