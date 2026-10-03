import type { LyricChunk, Word } from '@/types';
import { formatClockTime, formatPreciseTime, parseTime } from './time';

export type ExportFormat = 'lrc' | 'lrc-enhanced' | 'srt' | 'vtt' | 'txt' | 'json';

export interface ExportFormatInfo {
  id: ExportFormat;
  label: string;
  description: string;
  extension: string;
  mime: string;
}

export const EXPORT_FORMATS: ExportFormatInfo[] = [
  { id: 'lrc', label: 'LRC', description: 'Line-synced lyrics for music players', extension: 'lrc', mime: 'text/plain' },
  { id: 'lrc-enhanced', label: 'Enhanced LRC', description: 'Word-by-word karaoke timing', extension: 'lrc', mime: 'text/plain' },
  { id: 'srt', label: 'SRT', description: 'Subtitles for video editors', extension: 'srt', mime: 'application/x-subrip' },
  { id: 'vtt', label: 'WebVTT', description: 'Subtitles for the web', extension: 'vtt', mime: 'text/vtt' },
  { id: 'txt', label: 'Plain text', description: 'Lyrics without timing', extension: 'txt', mime: 'text/plain' },
  { id: 'json', label: 'JSON', description: 'Raw data with word timings', extension: 'json', mime: 'application/json' },
];

export interface ExportMeta {
  title?: string;
  artist?: string;
  album?: string;
  language?: string;
}

const cleanText = (text: unknown) => (typeof text === 'string' ? text : String(text ?? '')).replace(/\s+/g, ' ').trim();

export function toLRC(chunks: LyricChunk[], meta: ExportMeta = {}, enhanced = false): string {
  const header = [
    meta.title && `[ti:${meta.title}]`,
    meta.artist && `[ar:${meta.artist}]`,
    meta.album && `[al:${meta.album}]`,
    meta.language && `[la:${meta.language}]`,
    '[re:LyricSync]',
  ].filter(Boolean);

  const lines = chunks
    .filter((chunk) => cleanText(chunk.text))
    .map((chunk) => {
      const stamp = `[${formatPreciseTime(chunk.timestamp[0])}]`;
      if (enhanced && chunk.words?.length) {
        const words = chunk.words.map((w) => `<${formatPreciseTime(w.timestamp[0])}>${w.word}`).join(' ');
        const last = chunk.words[chunk.words.length - 1];
        return `${stamp}${words} <${formatPreciseTime(last.timestamp[1])}>`;
      }
      return `${stamp}${cleanText(chunk.text)}`;
    });

  return [...header, '', ...lines, ''].join('\n');
}

export function toSRT(chunks: LyricChunk[]): string {
  return chunks
    .filter((chunk) => cleanText(chunk.text))
    .map(
      (chunk, i) =>
        `${i + 1}\n${formatClockTime(chunk.timestamp[0], ',')} --> ${formatClockTime(chunk.timestamp[1], ',')}\n${cleanText(chunk.text)}\n`,
    )
    .join('\n');
}

export function toVTT(chunks: LyricChunk[]): string {
  const cues = chunks
    .filter((chunk) => cleanText(chunk.text))
    .map(
      (chunk) =>
        `${formatClockTime(chunk.timestamp[0], '.')} --> ${formatClockTime(chunk.timestamp[1], '.')}\n${cleanText(chunk.text)}\n`,
    );
  return ['WEBVTT', '', ...cues].join('\n');
}

export function toPlainText(chunks: LyricChunk[]): string {
  return chunks.map((chunk) => cleanText(chunk.text)).filter(Boolean).join('\n') + '\n';
}

export function exportLyrics(format: ExportFormat, chunks: LyricChunk[], meta: ExportMeta = {}): string {
  switch (format) {
    case 'lrc':
      return toLRC(chunks, meta);
    case 'lrc-enhanced':
      return toLRC(chunks, meta, true);
    case 'srt':
      return toSRT(chunks);
    case 'vtt':
      return toVTT(chunks);
    case 'txt':
      return toPlainText(chunks);
    case 'json':
      return JSON.stringify({ ...meta, chunks }, null, 2);
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

const LRC_TIME = /\[(\d+:\d+(?:[.:]\d+)?)\]/g;
const LRC_WORD = /<(\d+:\d+(?:\.\d+)?)>\s*([^<]*)/g;

function lrcTime(value: string): number | null {
  // Some players write [mm:ss:cc]; normalise the last colon to a dot
  const normalised = value.replace(/^(\d+:\d+):(\d+)$/, '$1.$2');
  return parseTime(normalised);
}

export function parseLRC(content: string, fallbackDuration = 5): LyricChunk[] {
  const entries: { start: number; text: string; words?: Word[] }[] = [];
  let offset = 0;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    const offsetMatch = line.match(/^\[offset:\s*([+-]?\d+)\]$/i);
    if (offsetMatch) {
      // LRC offsets are in ms; positive means lyrics appear earlier
      offset = -parseInt(offsetMatch[1], 10) / 1000;
      continue;
    }

    const times = [...line.matchAll(LRC_TIME)].map((m) => lrcTime(m[1])).filter((t): t is number => t !== null);
    if (!times.length) continue;

    const body = line.replace(LRC_TIME, '').trim();
    const wordMatches = [...body.matchAll(LRC_WORD)];
    let text = body;
    let words: Word[] | undefined;

    if (wordMatches.length) {
      const parsed = wordMatches
        .map((m) => ({ time: lrcTime(m[1]), word: m[2].trim() }))
        .filter((w): w is { time: number; word: string } => w.time !== null);
      text = parsed.map((w) => w.word).filter(Boolean).join(' ');
      words = [];
      parsed.forEach((w, i) => {
        if (!w.word) return;
        const end = parsed[i + 1]?.time ?? w.time + 0.5;
        words!.push({ word: w.word, timestamp: [w.time, end] });
      });
    }
    if (!text) continue;

    for (const start of times) {
      entries.push({ start, text, words });
    }
  }

  entries.sort((a, b) => a.start - b.start);
  return entries.map((entry, i) => {
    const start = Math.max(0, entry.start + offset);
    const nextStart = entries[i + 1] ? entries[i + 1].start + offset : undefined;
    const lastWordEnd = entry.words?.length ? entry.words[entry.words.length - 1].timestamp[1] + offset : undefined;
    const end = lastWordEnd ?? nextStart ?? start + fallbackDuration;
    const chunk: LyricChunk = { text: entry.text, timestamp: [start, Math.max(start, end)] };
    if (entry.words?.length) {
      chunk.words = entry.words.map((w) => ({
        word: w.word,
        timestamp: [Math.max(0, w.timestamp[0] + offset), Math.max(0, w.timestamp[1] + offset)],
      }));
    }
    return chunk;
  });
}

const CUE_TIMING = /^((?:\d+:)?\d+:\d+[.,]\d+)\s*-->\s*((?:\d+:)?\d+:\d+[.,]\d+)/;

/** Parse SRT or WebVTT subtitle files. */
export function parseSubtitles(content: string): LyricChunk[] {
  const chunks: LyricChunk[] = [];
  const blocks = content.replace(/\r/g, '').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim());
    const timingIndex = lines.findIndex((l) => CUE_TIMING.test(l));
    if (timingIndex === -1) continue;
    const [, startRaw, endRaw] = lines[timingIndex].match(CUE_TIMING)!;
    const start = parseTime(startRaw);
    const end = parseTime(endRaw);
    const text = lines
      .slice(timingIndex + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (start === null || end === null || !text) continue;
    chunks.push({ text, timestamp: [start, end] });
  }
  return chunks.sort((a, b) => a.timestamp[0] - b.timestamp[0]);
}

/** Detect a lyrics file's format from its name or contents and parse it. */
export function parseLyricsFile(filename: string, content: string): LyricChunk[] {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'json') {
    const data = JSON.parse(content);
    const chunks = Array.isArray(data) ? data : data.chunks ?? data.result?.chunks;
    if (!Array.isArray(chunks)) throw new Error('JSON file has no "chunks" array');
    return chunks;
  }
  if (ext === 'srt' || ext === 'vtt' || CUE_TIMING.test(content.split('\n').find((l) => l.includes('-->')) ?? '')) {
    return parseSubtitles(content);
  }
  return parseLRC(content);
}
