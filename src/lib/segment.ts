import type { LyricChunk, Word } from '@/types';
import { distributeWords } from './lyrics';

/** A raw timed token as produced by the Whisper pipeline. */
export interface RawChunk {
  text: string;
  timestamp: [number, number | null];
}

export interface SegmentOptions {
  /** Silence (seconds) that always starts a new line. */
  gap: number;
  maxWords: number;
  maxDuration: number;
}

const DEFAULTS: SegmentOptions = { gap: 0.8, maxWords: 12, maxDuration: 8 };

// Whisper often emits non-lyric annotations for instrumental sections
const NON_LYRIC = /^[\s♪♫🎵🎶*-]*$|^\s*[[(][^\])]*[\])]\s*$/u;

const round = (n: number) => Math.round(n * 100) / 100;

function cleanWords(raw: RawChunk[]): Word[] {
  const words: Word[] = [];
  raw.forEach((chunk, i) => {
    const text = chunk.text.replace(/[♪♫🎵🎶]/gu, '').trim();
    if (!text || NON_LYRIC.test(chunk.text)) return;
    const start = chunk.timestamp[0];
    const nextStart = raw[i + 1]?.timestamp[0];
    const end = chunk.timestamp[1] ?? (nextStart !== undefined ? Math.max(start, nextStart) : start + 0.5);
    words.push({ word: text, timestamp: [round(start), round(Math.max(start, end))] });
  });
  return words;
}

/**
 * Group word-level output into lyric lines using pauses, punctuation and
 * length limits, since Whisper's own segments aren't aligned to sung lines.
 */
export function segmentWords(raw: RawChunk[], options: Partial<SegmentOptions> = {}): LyricChunk[] {
  const opts = { ...DEFAULTS, ...options };
  const words = cleanWords(raw);
  const lines: LyricChunk[] = [];
  let current: Word[] = [];

  const flush = () => {
    if (!current.length) return;
    lines.push({
      text: current.map((w) => w.word).join(' '),
      timestamp: [current[0].timestamp[0], current[current.length - 1].timestamp[1]],
      words: current,
    });
    current = [];
  };

  for (const word of words) {
    const prev = current[current.length - 1];
    if (prev) {
      const gap = word.timestamp[0] - prev.timestamp[1];
      const duration = word.timestamp[1] - current[0].timestamp[0];
      const sentenceEnd = /[.!?;:]["')\]]*$/.test(prev.word);
      const softBreak = /[,—–]["')\]]*$/.test(prev.word) && current.length >= 4;
      if (gap >= opts.gap || sentenceEnd || softBreak || current.length >= opts.maxWords || duration > opts.maxDuration) {
        flush();
      }
    }
    current.push(word);
  }
  flush();
  return lines;
}

/** Fallback for models without word timing: turn segments into lines with estimated word timing. */
export function segmentsToLines(raw: RawChunk[]): LyricChunk[] {
  const lines: LyricChunk[] = [];
  raw.forEach((chunk, i) => {
    const text = chunk.text.replace(/[♪♫🎵🎶]/gu, '').trim();
    if (!text || NON_LYRIC.test(chunk.text)) return;
    const start = round(chunk.timestamp[0]);
    const end = round(chunk.timestamp[1] ?? raw[i + 1]?.timestamp[0] ?? start + 3);
    const words = distributeWords(text, start, end);
    lines.push({ text, timestamp: [start, end], ...(words.length ? { words } : {}) });
  });
  return lines;
}
