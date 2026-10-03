import { describe, expect, it } from 'vitest';
import { segmentsToLines, segmentWords, type RawChunk } from '../segment';

const w = (text: string, start: number, end: number | null): RawChunk => ({ text, timestamp: [start, end] });

describe('segmentWords', () => {
  it('splits lines on pauses', () => {
    const lines = segmentWords([w(' Hello', 0, 0.4), w(' there', 0.4, 0.9), w(' friend', 2, 2.5)]);
    expect(lines.map((l) => l.text)).toEqual(['Hello there', 'friend']);
    expect(lines[0].timestamp).toEqual([0, 0.9]);
    expect(lines[0].words).toEqual([
      { word: 'Hello', timestamp: [0, 0.4] },
      { word: 'there', timestamp: [0.4, 0.9] },
    ]);
  });

  it('splits after sentence punctuation', () => {
    const lines = segmentWords([w(' Stop.', 0, 0.3), w(' Go', 0.35, 0.6)]);
    expect(lines.map((l) => l.text)).toEqual(['Stop.', 'Go']);
  });

  it('splits on commas only once the line has a few words', () => {
    const short = segmentWords([w(' Oh,', 0, 0.2), w(' yeah', 0.2, 0.4)]);
    expect(short).toHaveLength(1);
    const long = segmentWords([w(' a', 0, 0.1), w(' b', 0.1, 0.2), w(' c', 0.2, 0.3), w(' d,', 0.3, 0.4), w(' e', 0.4, 0.5)]);
    expect(long.map((l) => l.text)).toEqual(['a b c d,', 'e']);
  });

  it('enforces a maximum line length', () => {
    const words = Array.from({ length: 15 }, (_, i) => w(` w${i}`, i * 0.2, i * 0.2 + 0.2));
    const lines = segmentWords(words, { maxWords: 6 });
    expect(lines.map((l) => l.words!.length)).toEqual([6, 6, 3]);
  });

  it('drops music markers and fills missing end times', () => {
    const lines = segmentWords([w(' [Music]', 0, 5), w(' ♪', 5, 6), w(' la', 6, null), w(' la', 6.3, null)]);
    expect(lines).toHaveLength(1);
    expect(lines[0].words).toEqual([
      { word: 'la', timestamp: [6, 6.3] },
      { word: 'la', timestamp: [6.3, 6.8] },
    ]);
  });

  it('handles empty input', () => {
    expect(segmentWords([])).toEqual([]);
  });
});

describe('segmentsToLines', () => {
  it('estimates word timing from segments', () => {
    const lines = segmentsToLines([w(' Hello world', 0, 2), w(' (upbeat music)', 2, 4), w(' Bye', 4, null)]);
    expect(lines.map((l) => l.text)).toEqual(['Hello world', 'Bye']);
    expect(lines[0].words?.at(-1)?.timestamp[1]).toBe(2);
    expect(lines[1].timestamp).toEqual([4, 7]);
  });
});
