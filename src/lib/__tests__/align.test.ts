import { describe, expect, it } from 'vitest';
import type { LyricChunk } from '@/types';
import { alignLyrics, normalizeWord, parseLyricsText } from '../align';

const transcribed: LyricChunk[] = [
  {
    text: 'I look up from the grand',
    timestamp: [0, 2],
    words: [
      { word: 'I', timestamp: [0, 0.2] },
      { word: 'look', timestamp: [0.2, 0.6] },
      { word: 'up', timestamp: [0.6, 0.9] },
      { word: 'from', timestamp: [0.9, 1.2] },
      { word: 'the', timestamp: [1.2, 1.4] },
      { word: 'grand', timestamp: [1.4, 2.0] },
    ],
  },
  {
    text: 'to see your bad and dreary eyes',
    timestamp: [2.2, 5],
    words: [
      { word: 'to', timestamp: [2.2, 2.4] },
      { word: 'see', timestamp: [2.4, 2.8] },
      { word: 'your', timestamp: [2.8, 3.1] },
      { word: 'bad', timestamp: [3.1, 3.5] },
      { word: 'and', timestamp: [3.5, 3.7] },
      { word: 'dreary', timestamp: [3.7, 4.3] },
      { word: 'eyes', timestamp: [4.3, 5.0] },
    ],
  },
];

describe('normalizeWord', () => {
  it('ignores case, punctuation, apostrophes and accents', () => {
    expect(normalizeWord("Don't,")).toBe('dont');
    expect(normalizeWord('Café!')).toBe('cafe');
  });
});

describe('parseLyricsText', () => {
  it('drops blank lines and section headers', () => {
    expect(parseLyricsText('[Verse 1]\nHello\n\n(Chorus)\nWorld  \n')).toEqual(['Hello', 'World']);
  });
});

describe('alignLyrics', () => {
  it('uses the pasted text and line breaks with transcription timing', () => {
    const { chunks, matchRate } = alignLyrics(
      'I look up from the ground to see\nyour sad and teary eyes',
      transcribed,
    );
    expect(chunks.map((c) => c.text)).toEqual(['I look up from the ground to see', 'your sad and teary eyes']);
    expect(chunks[0].timestamp).toEqual([0, 2.8]);
    expect(chunks[1].timestamp).toEqual([2.8, 5]);
    // Misrecognised words take the timing of what was heard in their place
    expect(chunks[0].words?.[5]).toEqual({ word: 'ground', timestamp: [1.4, 2] });
    expect(chunks[1].words?.[3]).toEqual({ word: 'teary', timestamp: [3.7, 4.3] });
    expect(matchRate).toBeGreaterThan(0.8);
  });

  it('interpolates words the transcription missed entirely', () => {
    const { chunks } = alignLyrics('I look up from the ground\noh oh oh\nto see your sad and teary eyes', transcribed);
    const oh = chunks[1];
    expect(oh.words).toHaveLength(3);
    expect(oh.timestamp[0]).toBeGreaterThanOrEqual(2);
    expect(oh.timestamp[1]).toBeLessThanOrEqual(2.2);
    for (const c of chunks) {
      for (let i = 1; i < c.words!.length; i++) {
        expect(c.words![i].timestamp[0]).toBeGreaterThanOrEqual(c.words![i - 1].timestamp[0]);
      }
    }
  });

  it('reports a low match rate for unrelated lyrics', () => {
    const { matchRate } = alignLyrics('completely different words here', transcribed);
    expect(matchRate).toBeLessThan(0.3);
  });

  it('errors on empty input', () => {
    expect(() => alignLyrics('  \n', transcribed)).toThrow();
    expect(() => alignLyrics('hello', [])).toThrow();
  });
});
