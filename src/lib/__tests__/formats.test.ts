import { describe, expect, it } from 'vitest';
import type { LyricChunk } from '@/types';
import { parseLRC, parseLyricsFile, parseSubtitles, toLRC, toSRT, toVTT, toPlainText } from '../formats';

const chunks: LyricChunk[] = [
  {
    text: 'Hello world',
    timestamp: [1.5, 3],
    words: [
      { word: 'Hello', timestamp: [1.5, 2.2] },
      { word: 'world', timestamp: [2.2, 3] },
    ],
  },
  { text: 'Second  line ', timestamp: [65.25, 70] },
  { text: '   ', timestamp: [71, 72] },
];

describe('exporters', () => {
  it('writes LRC with metadata and skips blank lines', () => {
    const lrc = toLRC(chunks, { title: 'Song', artist: 'Me' });
    expect(lrc).toContain('[ti:Song]');
    expect(lrc).toContain('[ar:Me]');
    expect(lrc).toContain('[00:01.50]Hello world');
    expect(lrc).toContain('[01:05.25]Second line');
    expect(lrc.match(/^\[\d/gm)).toHaveLength(2);
  });

  it('writes enhanced LRC with word timestamps', () => {
    const lrc = toLRC(chunks, {}, true);
    expect(lrc).toContain('[00:01.50]<00:01.50>Hello <00:02.20>world <00:03.00>');
  });

  it('writes SRT', () => {
    expect(toSRT(chunks)).toBe(
      '1\n00:00:01,500 --> 00:00:03,000\nHello world\n\n2\n00:01:05,250 --> 00:01:10,000\nSecond line\n',
    );
  });

  it('writes VTT', () => {
    const vtt = toVTT(chunks);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('00:00:01.500 --> 00:00:03.000\nHello world');
  });

  it('writes plain text', () => {
    expect(toPlainText(chunks)).toBe('Hello world\nSecond line\n');
  });
});

describe('parseLRC', () => {
  it('parses lines, ignores tags, and infers end times', () => {
    const parsed = parseLRC('[ti:Song]\n[00:01.50]Hello\n[00:04.00]World\n');
    expect(parsed).toEqual([
      { text: 'Hello', timestamp: [1.5, 4] },
      { text: 'World', timestamp: [4, 9] },
    ]);
  });

  it('expands repeated timestamps and sorts', () => {
    const parsed = parseLRC('[00:10.00][00:02.00]Chorus\n[00:05.00]Verse');
    expect(parsed.map((c) => [c.text, c.timestamp[0]])).toEqual([
      ['Chorus', 2],
      ['Verse', 5],
      ['Chorus', 10],
    ]);
  });

  it('applies the offset tag', () => {
    const parsed = parseLRC('[offset:500]\n[00:02.00]Early');
    expect(parsed[0].timestamp[0]).toBe(1.5);
  });

  it('round-trips enhanced LRC including words', () => {
    const parsed = parseLRC(toLRC(chunks, {}, true));
    expect(parsed[0].text).toBe('Hello world');
    expect(parsed[0].words).toEqual(chunks[0].words);
    expect(parsed[0].timestamp).toEqual([1.5, 3]);
  });
});

describe('parseSubtitles', () => {
  it('round-trips SRT', () => {
    const parsed = parseSubtitles(toSRT(chunks));
    expect(parsed).toEqual([
      { text: 'Hello world', timestamp: [1.5, 3] },
      { text: 'Second line', timestamp: [65.25, 70] },
    ]);
  });

  it('parses VTT with cue settings and tags', () => {
    const parsed = parseSubtitles('WEBVTT\n\nintro\n00:01.000 --> 00:02.500 align:start\n<i>Hi</i> there\n');
    expect(parsed).toEqual([{ text: 'Hi there', timestamp: [1, 2.5] }]);
  });
});

describe('parseLyricsFile', () => {
  it('detects formats', () => {
    expect(parseLyricsFile('a.srt', toSRT(chunks))).toHaveLength(2);
    expect(parseLyricsFile('a.lrc', toLRC(chunks))).toHaveLength(2);
    expect(parseLyricsFile('a.json', JSON.stringify({ chunks }))).toHaveLength(3);
  });

  it('rejects JSON without chunks', () => {
    expect(() => parseLyricsFile('a.json', '{}')).toThrow();
  });
});
