import type { LyricChunk, Word } from '@/types';
import { phoneticKey } from './phonetic';

/**
 * Align user-supplied lyrics to transcribed, timed words. The lyrics text and
 * line breaks come from the user; the timing comes from the transcription.
 * This sidesteps recognition errors entirely when the real lyrics are known.
 */

interface RefWord {
  text: string;
  norm: string;
  sound: string;
  line: number;
}

interface HypWord {
  norm: string;
  sound: string;
  start: number;
  end: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function normalizeWord(word: string): string {
  return word
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // strip diacritics
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** Parse pasted lyrics: one line per line, skipping blanks and section tags like [Chorus]. */
export function parseLyricsText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^[[(].*[\])]$/.test(line));
}

function editSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return 1 - prev[n] / Math.max(m, n);
}

/** Best of spelling and sound similarity, so misheard words still match their lyric. */
function similarity(a: { norm: string; sound: string }, b: { norm: string; sound: string }): number {
  const spelling = editSimilarity(a.norm, b.norm);
  if (spelling === 1 || !a.sound || !b.sound) return spelling;
  const sound = a.sound === b.sound ? 0.9 : editSimilarity(a.sound, b.sound) * 0.85;
  return Math.max(spelling, sound);
}

const MATCH = 3;
const NEAR = 1.5;
const MISMATCH = -1;
const GAP = -1;

/** Needleman–Wunsch alignment; returns, for each ref word, the index of its hyp word (or -1). */
function alignSequences(ref: RefWord[], hyp: HypWord[]): Int32Array {
  const n = ref.length;
  const m = hyp.length;
  const width = m + 1;
  const score = new Float32Array((n + 1) * width);
  // 0 = diagonal, 1 = up (skip ref), 2 = left (skip hyp)
  const trace = new Uint8Array((n + 1) * width);

  for (let i = 1; i <= n; i++) {
    score[i * width] = i * GAP;
    trace[i * width] = 1;
  }
  for (let j = 1; j <= m; j++) {
    score[j] = j * GAP;
    trace[j] = 2;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sim = similarity(ref[i - 1], hyp[j - 1]);
      const pair = sim === 1 ? MATCH : sim >= 0.6 ? NEAR : MISMATCH;
      const diag = score[(i - 1) * width + j - 1] + pair;
      const up = score[(i - 1) * width + j] + GAP;
      const left = score[i * width + j - 1] + GAP;
      const idx = i * width + j;
      if (diag >= up && diag >= left) {
        score[idx] = diag;
        trace[idx] = 0;
      } else if (up >= left) {
        score[idx] = up;
        trace[idx] = 1;
      } else {
        score[idx] = left;
        trace[idx] = 2;
      }
    }
  }

  const mapping = new Int32Array(n).fill(-1);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const t = trace[i * width + j];
    if (i > 0 && j > 0 && t === 0) {
      mapping[i - 1] = j - 1;
      i--;
      j--;
    } else if (i > 0 && (j === 0 || t === 1)) {
      i--;
    } else {
      j--;
    }
  }
  return mapping;
}

export interface AlignResult {
  chunks: LyricChunk[];
  /** Share of lyric words that matched a transcribed word (0–1); a rough confidence. */
  matchRate: number;
}

export function alignLyrics(lyricsText: string, transcribed: LyricChunk[], duration?: number): AlignResult {
  const lines = parseLyricsText(lyricsText);
  const ref: RefWord[] = [];
  lines.forEach((line, lineIndex) => {
    for (const text of line.split(/\s+/).filter(Boolean)) {
      ref.push({ text, norm: normalizeWord(text), sound: phoneticKey(text), line: lineIndex });
    }
  });
  if (!ref.length) throw new Error('Paste some lyrics first.');

  const hyp: HypWord[] = [];
  for (const chunk of transcribed) {
    const words = chunk.words?.length ? chunk.words : [{ word: chunk.text, timestamp: chunk.timestamp }];
    for (const w of words) {
      const norm = normalizeWord(w.word);
      if (norm) hyp.push({ norm, sound: phoneticKey(w.word), start: w.timestamp[0], end: w.timestamp[1] });
    }
  }
  if (!hyp.length) throw new Error('There is no transcription to align to. Generate lyrics first.');

  const mapping = alignSequences(ref, hyp);

  // Assign times to matched words
  const times: ([number, number] | null)[] = ref.map((_, i) => {
    const h = mapping[i];
    return h >= 0 ? [hyp[h].start, hyp[h].end] : null;
  });
  let exact = 0;
  ref.forEach((r, i) => {
    if (mapping[i] >= 0 && similarity(r, hyp[mapping[i]]) >= 0.6) exact++;
  });

  // Interpolate unmatched runs between their timed neighbours, weighted by word length
  const end = duration ?? hyp[hyp.length - 1].end;
  let i = 0;
  while (i < ref.length) {
    if (times[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < ref.length && !times[j]) j++;
    const from = i > 0 ? times[i - 1]![1] : Math.max(0, (times[j]?.[0] ?? 0) - 0.4 * (j - i));
    const to = j < ref.length ? times[j]![0] : Math.max(from, Math.min(end, from + 0.4 * (j - i)));
    const span = Math.max(0, to - from);
    const total = ref.slice(i, j).reduce((sum, r) => sum + Math.max(1, r.text.length), 0);
    let cursor = from;
    for (let k = i; k < j; k++) {
      const len = (span * Math.max(1, ref[k].text.length)) / total;
      times[k] = [cursor, cursor + len];
      cursor += len;
    }
    i = j;
  }

  const chunks: LyricChunk[] = lines.map((text, lineIndex) => {
    const words: Word[] = [];
    ref.forEach((r, k) => {
      if (r.line === lineIndex) {
        const [s, e] = times[k]!;
        words.push({ word: r.text, timestamp: [round(s), round(Math.max(s, e))] });
      }
    });
    // Keep word times monotonic in case alignment crossed over
    for (let k = 1; k < words.length; k++) {
      if (words[k].timestamp[0] < words[k - 1].timestamp[0]) {
        words[k].timestamp = [words[k - 1].timestamp[1], Math.max(words[k - 1].timestamp[1], words[k].timestamp[1])];
      }
    }
    return {
      text,
      timestamp: [words[0].timestamp[0], words[words.length - 1].timestamp[1]],
      words,
    };
  });

  return { chunks, matchRate: exact / ref.length };
}
