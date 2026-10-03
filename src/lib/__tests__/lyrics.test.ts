import { describe, expect, it } from 'vitest';
import type { LyricChunk } from '@/types';
import { distributeWords, editChunk, findActiveChunkIndex, shiftChunks } from '../lyrics';

const chunks: LyricChunk[] = [
  { text: 'one', timestamp: [1, 2] },
  { text: 'two', timestamp: [3, 4] },
  { text: 'three', timestamp: [6, 7] },
];

describe('findActiveChunkIndex', () => {
  it('returns -1 before the first line', () => {
    expect(findActiveChunkIndex(chunks, 0.5)).toBe(-1);
  });

  it('keeps the previous line active through gaps', () => {
    expect(findActiveChunkIndex(chunks, 1)).toBe(0);
    expect(findActiveChunkIndex(chunks, 2.5)).toBe(0);
    expect(findActiveChunkIndex(chunks, 3)).toBe(1);
    expect(findActiveChunkIndex(chunks, 100)).toBe(2);
  });

  it('handles empty input', () => {
    expect(findActiveChunkIndex([], 5)).toBe(-1);
  });
});

describe('editChunk', () => {
  const original: LyricChunk = {
    text: 'hello world',
    timestamp: [10, 12],
    words: [
      { word: 'hello', timestamp: [10, 11] },
      { word: 'world', timestamp: [11, 12] },
    ],
  };

  it('rescales word timings when only times change', () => {
    const edited = editChunk(original, 'hello world', 20, 24);
    expect(edited.timestamp).toEqual([20, 24]);
    expect(edited.words).toEqual([
      { word: 'hello', timestamp: [20, 22] },
      { word: 'world', timestamp: [22, 24] },
    ]);
  });

  it('re-estimates words when the text changes', () => {
    const edited = editChunk(original, 'hi there friend', 10, 12);
    expect(edited.words?.map((w) => w.word)).toEqual(['hi', 'there', 'friend']);
    expect(edited.words?.[0].timestamp[0]).toBe(10);
    expect(edited.words?.at(-1)?.timestamp[1]).toBe(12);
  });

  it('swaps reversed times', () => {
    expect(editChunk(original, 'x', 5, 3).timestamp).toEqual([3, 5]);
  });
});

describe('distributeWords', () => {
  it('weights by word length and covers the full span', () => {
    const words = distributeWords('a bbb', 0, 4);
    expect(words).toEqual([
      { word: 'a', timestamp: [0, 1] },
      { word: 'bbb', timestamp: [1, 4] },
    ]);
  });
});

describe('shiftChunks', () => {
  it('shifts lines and words, clamping at zero', () => {
    const shifted = shiftChunks([{ text: 'a', timestamp: [0.05, 1], words: [{ word: 'a', timestamp: [0.05, 1] }] }], -0.1);
    expect(shifted[0].timestamp).toEqual([0, 0.9]);
    expect(shifted[0].words?.[0].timestamp).toEqual([0, 0.9]);
  });
});
