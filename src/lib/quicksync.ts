import type { LyricChunk, Word } from '@/types';
import { parseLyricsText } from './align';
import { countSyllables } from './syllables';

/**
 * Algorithmic lyric sync, no AI model: detect sung-syllable onsets in the
 * audio and align the syllables of the given lyrics to them with dynamic
 * programming. Fast and fully offline, but rough on dense mixes, so treat
 * the result as a starting point to fine-tune.
 */

const SAMPLE_RATE = 16_000;
const FFT_SIZE = 512;
const HOP = 160; // 10 ms
const FRAME_SECONDS = HOP / SAMPLE_RATE;

export interface Onset {
  time: number;
  strength: number;
}

// --- Signal analysis ---------------------------------------------------------

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Spectral-flux onset strength in the vocal band (300 Hz – 4 kHz), one value per 10 ms frame. */
export function onsetStrength(samples: Float32Array): Float32Array {
  const frames = Math.max(0, Math.floor((samples.length - FFT_SIZE) / HOP) + 1);
  const lo = Math.round((300 * FFT_SIZE) / SAMPLE_RATE);
  const hi = Math.round((4000 * FFT_SIZE) / SAMPLE_RATE);
  const window = new Float64Array(FFT_SIZE).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FFT_SIZE));
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  let prev = new Float64Array(hi - lo);
  let curr = new Float64Array(hi - lo);
  const flux = new Float32Array(frames);

  for (let f = 0; f < frames; f++) {
    const offset = f * HOP;
    for (let i = 0; i < FFT_SIZE; i++) {
      re[i] = samples[offset + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);
    let sum = 0;
    for (let k = lo; k < hi; k++) {
      const mag = Math.log1p(100 * Math.hypot(re[k], im[k]));
      curr[k - lo] = mag;
      if (f > 0) sum += Math.max(0, mag - prev[k - lo]);
    }
    flux[f] = sum;
    [prev, curr] = [curr, prev];
  }

  // Remove the slowly varying baseline (sustained instruments) with a moving average
  const radius = 25; // ±250 ms
  const out = new Float32Array(frames);
  let acc = 0;
  for (let i = 0; i < Math.min(frames, radius); i++) acc += flux[i];
  for (let i = 0; i < frames; i++) {
    if (i + radius < frames) acc += flux[i + radius];
    if (i - radius - 1 >= 0) acc -= flux[i - radius - 1];
    const count = Math.min(frames, i + radius + 1) - Math.max(0, i - radius);
    out[i] = Math.max(0, flux[i] - acc / count);
  }
  return out;
}

/** Local maxima of the onset envelope, at least `minGap` seconds apart, scaled to 0–1. */
export function pickOnsets(envelope: Float32Array, minGap = 0.08): Onset[] {
  const sorted = Array.from(envelope).sort((a, b) => a - b);
  const ref = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.995))] || 1;
  const floor = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const span = Math.max(1, Math.round(minGap / FRAME_SECONDS / 2));
  const onsets: Onset[] = [];
  for (let i = 0; i < envelope.length; i++) {
    const v = envelope[i];
    if (v <= floor) continue;
    let isPeak = true;
    for (let k = Math.max(0, i - span); k <= Math.min(envelope.length - 1, i + span); k++) {
      if (envelope[k] > v || (envelope[k] === v && k < i)) {
        isPeak = false;
        break;
      }
    }
    // Squared so a few clear onsets outweigh many faint ones (background texture)
    if (isPeak) onsets.push({ time: (i * HOP + FFT_SIZE / 2) / SAMPLE_RATE, strength: Math.min(1, v / ref) ** 2 });
  }
  return onsets;
}

// --- Alignment ---------------------------------------------------------------

interface Syllable {
  line: number;
  word: number;
  lineStart: boolean;
  wordStart: boolean;
}

const IN_LINE_MAX_GAP = 3; // seconds between syllables of one line (held notes)
const LINE_MAX_GAP = 30; // seconds between lines (instrumental breaks)
const MIN_GAP = 0.06;

function transition(syl: Syllable, dt: number): number {
  if (dt < MIN_GAP) return -Infinity;
  if (syl.lineStart) {
    // Lines tend to begin after a breath; reward a pause, mildly
    return 0.35 * Math.min(1, dt / 1.5);
  }
  // Within a line, syllables are close together; long gaps are unlikely
  const soft = syl.wordStart ? 0.9 : 0.6;
  return dt > soft ? -0.6 * (dt - soft) : 0;
}

export interface QuickSyncResult {
  chunks: LyricChunk[];
  onsetCount: number;
}

export function quickSync(lyricsText: string, samples: Float32Array): QuickSyncResult {
  const lines = parseLyricsText(lyricsText);
  if (!lines.length) throw new Error('Paste the lyrics to sync first.');
  const lineWords = lines.map((l) => l.split(/\s+/).filter(Boolean));

  const syllables: Syllable[] = [];
  lineWords.forEach((words, line) =>
    words.forEach((w, word) => {
      const n = Math.max(1, countSyllables(w));
      for (let s = 0; s < n; s++) syllables.push({ line, word, lineStart: word === 0 && s === 0, wordStart: s === 0 });
    }),
  );

  const duration = samples.length / SAMPLE_RATE;
  let onsets = pickOnsets(onsetStrength(samples));
  // Need at least one candidate per syllable; fall back to denser candidates
  if (onsets.length < syllables.length) onsets = pickOnsets(onsetStrength(samples), 0.04);
  if (onsets.length < syllables.length) {
    throw new Error('Not enough distinct sounds detected for these lyrics. Try AI sync instead.');
  }

  const S = syllables.length;
  const O = onsets.length;
  const times = onsets.map((o) => o.time);
  const dp = new Float32Array(S * O).fill(-Infinity);
  const back = new Int32Array(S * O).fill(-1);

  for (let j = 0; j < O; j++) dp[j] = onsets[j].strength;

  for (let i = 1; i < S; i++) {
    const syl = syllables[i];
    const maxGap = syl.lineStart ? LINE_MAX_GAP : IN_LINE_MAX_GAP;
    let kStart = 0;
    for (let j = 1; j < O; j++) {
      while (times[j] - times[kStart] > maxGap) kStart++;
      let best = -Infinity;
      let bestK = -1;
      for (let k = kStart; k < j; k++) {
        const prev = dp[(i - 1) * O + k];
        if (prev === -Infinity) continue;
        const score = prev + transition(syl, times[j] - times[k]);
        if (score > best) {
          best = score;
          bestK = k;
        }
      }
      if (bestK >= 0) {
        dp[i * O + j] = best + onsets[j].strength;
        back[i * O + j] = bestK;
      }
    }
  }

  let end = -1;
  let bestScore = -Infinity;
  for (let j = 0; j < O; j++) {
    if (dp[(S - 1) * O + j] > bestScore) {
      bestScore = dp[(S - 1) * O + j];
      end = j;
    }
  }
  if (end < 0) throw new Error("Couldn't fit the lyrics to this audio. Try AI sync instead.");

  const assigned = new Float64Array(S);
  for (let i = S - 1, j = end; i >= 0; i--) {
    assigned[i] = times[j];
    j = back[i * O + j];
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const chunks: LyricChunk[] = lineWords.map((words, line) => {
    const lineSyl = syllables.map((s, i) => ({ ...s, t: assigned[i] })).filter((s) => s.line === line);
    const nextLineStart = syllables.findIndex((s) => s.line === line + 1);
    const lineCap = nextLineStart >= 0 ? assigned[nextLineStart] : duration;
    const timed: Word[] = words.map((word, w) => {
      const own = lineSyl.filter((s) => s.word === w);
      const start = own[0].t;
      const next = lineSyl.find((s) => s.word === w + 1);
      const end = next ? next.t : Math.min(lineCap, own[own.length - 1].t + 0.4);
      return { word, timestamp: [round(start), round(Math.max(start, end))] };
    });
    return { text: lines[line], timestamp: [timed[0].timestamp[0], timed[timed.length - 1].timestamp[1]], words: timed };
  });

  return { chunks, onsetCount: O };
}
