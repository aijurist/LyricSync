import type { LyricChunk, Word } from '@/types';

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Index of the line that should be highlighted at `time`: the last line that
 * has started. Lines stay active through instrumental gaps until the next one.
 */
export function findActiveChunkIndex(chunks: LyricChunk[], time: number): number {
  let lo = 0;
  let hi = chunks.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (chunks[mid].timestamp[0] <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/** Spread words across [start, end], weighting each by its length. */
export function distributeWords(text: string, start: number, end: number): Word[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length || end <= start) return [];
  const totalChars = tokens.reduce((sum, t) => sum + t.length, 0);
  const span = end - start;
  let cursor = start;
  return tokens.map((word, i) => {
    const wordEnd = i === tokens.length - 1 ? end : cursor + (span * word.length) / totalChars;
    const w: Word = { word, timestamp: [round(cursor), round(wordEnd)] };
    cursor = wordEnd;
    return w;
  });
}

/**
 * Apply an edit to a line, keeping word-level timing usable: if only the times
 * changed the existing word timings are rescaled, otherwise they're re-estimated.
 */
export function editChunk(chunk: LyricChunk, text: string, start: number, end: number): LyricChunk {
  const cleanText = text.trim();
  if (end < start) [start, end] = [end, start];
  const updated: LyricChunk = { text: cleanText, timestamp: [round(start), round(end)] };

  const sameWords =
    chunk.words?.length &&
    chunk.words.map((w) => w.word).join(' ') === cleanText.split(/\s+/).filter(Boolean).join(' ');

  if (sameWords && chunk.words) {
    const [oldStart, oldEnd] = chunk.timestamp;
    const oldSpan = oldEnd - oldStart;
    const scale = oldSpan > 0 ? (end - start) / oldSpan : 0;
    updated.words = chunk.words.map((w) => ({
      word: w.word,
      timestamp: [
        round(start + (w.timestamp[0] - oldStart) * scale),
        round(start + (w.timestamp[1] - oldStart) * scale),
      ],
    }));
  } else {
    const words = distributeWords(cleanText, start, end);
    if (words.length) updated.words = words;
  }
  return updated;
}

/** Shift every timestamp by `offset` seconds, clamping at zero. */
export function shiftChunks(chunks: LyricChunk[], offset: number): LyricChunk[] {
  const shift = (t: number) => round(Math.max(0, t + offset));
  return chunks.map((chunk) => ({
    ...chunk,
    timestamp: [shift(chunk.timestamp[0]), shift(chunk.timestamp[1])],
    words: chunk.words?.map((w) => ({ ...w, timestamp: [shift(w.timestamp[0]), shift(w.timestamp[1])] })),
  }));
}

export function sortChunks(chunks: LyricChunk[]): LyricChunk[] {
  return [...chunks].sort((a, b) => a.timestamp[0] - b.timestamp[0]);
}

export function chunksToText(chunks: LyricChunk[]): string {
  return chunks.map((c) => c.text).join(' ');
}
