import { describe, expect, it } from 'vitest';
import { countSyllables } from '../syllables';
import { onsetStrength, pickOnsets, quickSync } from '../quicksync';

const SR = 16_000;

/** Quiet noise with short tonal "syllables" at the given times. */
function synth(duration: number, syllableTimes: number[]): Float32Array {
  const out = new Float32Array(Math.round(duration * SR));
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < out.length; i++) out[i] = rand() * 0.005;
  for (const t of syllableTimes) {
    const start = Math.round(t * SR);
    const len = Math.round(0.18 * SR);
    for (let i = 0; i < len && start + i < out.length; i++) {
      const env = Math.min(1, i / 80) * Math.exp(-i / (0.08 * SR));
      out[start + i] += env * 0.5 * (Math.sin((2 * Math.PI * 800 * i) / SR) + 0.5 * Math.sin((2 * Math.PI * 1600 * i) / SR));
    }
  }
  return out;
}

describe('countSyllables', () => {
  it.each([
    ['hello', 2],
    ['world', 1],
    ['love', 1],
    ['beautiful', 3],
    ['makes', 1],
    ['yesterday', 3],
    ['I', 1],
    ['こんにちは', 5],
    ['', 0],
  ])('%s → %i', (word, n) => {
    expect(countSyllables(word)).toBe(n);
  });
});

describe('onset detection', () => {
  it('finds syllable onsets in a synthetic signal', () => {
    const times = [1, 1.4, 1.8, 3, 3.5];
    const onsets = pickOnsets(onsetStrength(synth(5, times)));
    const strong = onsets.filter((o) => o.strength > 0.3).map((o) => o.time);
    for (const t of times) {
      expect(strong.some((s) => Math.abs(s - t) < 0.05)).toBe(true);
    }
  });
});

describe('quickSync', () => {
  it('aligns lines and words to detected syllables', () => {
    // "hello world" = 3 syllables, then a pause, "go now" = 2 syllables
    const audio = synth(8, [1.0, 1.3, 1.7, 5.0, 5.5]);
    const { chunks } = quickSync('hello world\ngo now', audio);
    expect(chunks.map((c) => c.text)).toEqual(['hello world', 'go now']);
    expect(chunks[0].timestamp[0]).toBeCloseTo(1.0, 1);
    expect(chunks[0].words![1].timestamp[0]).toBeCloseTo(1.7, 1);
    expect(chunks[1].timestamp[0]).toBeCloseTo(5.0, 1);
    expect(chunks[1].words![1].timestamp[0]).toBeCloseTo(5.5, 1);
  });

  it('stays on the vocals with a quieter beat in the background', () => {
    const vocals = [2.0, 2.3, 2.6, 2.9, 3.3, 6.0, 6.25, 6.5, 6.9, 10.0, 10.4, 10.8];
    const audio = synth(13, vocals);
    // Add a steady "hi-hat" every 0.5 s at a third of the vocal level
    for (let t = 0.25; t < 13; t += 0.5) {
      const start = Math.round(t * SR);
      for (let i = 0; i < 400; i++) audio[start + i] += 0.12 * Math.exp(-i / 60) * Math.sin(i * 1.9);
    }
    const { chunks } = quickSync('I can see the light\ncoming over me\nsing it now', audio);
    expect(chunks[0].timestamp[0]).toBeCloseTo(2.0, 1);
    expect(chunks[1].timestamp[0]).toBeCloseTo(6.0, 1);
    expect(chunks[2].timestamp[0]).toBeCloseTo(10.0, 1);
  });

  it('rejects empty lyrics', () => {
    expect(() => quickSync('', synth(1, []))).toThrow();
  });
});
