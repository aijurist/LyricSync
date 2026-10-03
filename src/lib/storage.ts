import type { LyricChunk, TranscriptionMeta } from '@/types';

const PREFIX = 'lyricsync:session:';
const MAX_SESSIONS = 10;

export interface SavedSession {
  chunks: LyricChunk[];
  meta?: TranscriptionMeta;
  savedAt: number;
}

/** Sessions are keyed by file identity so edits come back when the same file is reopened. */
export function sessionKey(file: File): string {
  return `${PREFIX}${file.name}:${file.size}:${file.lastModified}`;
}

export function loadSession(file: File): SavedSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(file));
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(file: File, chunks: LyricChunk[], meta?: TranscriptionMeta) {
  try {
    const session: SavedSession = { chunks, meta, savedAt: Date.now() };
    localStorage.setItem(sessionKey(file), JSON.stringify(session));
    pruneSessions();
  } catch {
    // Storage full or unavailable; persistence is best-effort
  }
}

export function clearSession(file: File) {
  try {
    localStorage.removeItem(sessionKey(file));
  } catch {
    // ignore
  }
}

function pruneSessions() {
  const sessions: { key: string; savedAt: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    try {
      sessions.push({ key, savedAt: JSON.parse(localStorage.getItem(key)!).savedAt ?? 0 });
    } catch {
      sessions.push({ key, savedAt: 0 });
    }
  }
  sessions
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(MAX_SESSIONS)
    .forEach((s) => localStorage.removeItem(s.key));
}

export function readPreference<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`lyricsync:${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePreference<T>(key: string, value: T) {
  try {
    localStorage.setItem(`lyricsync:${key}`, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function downloadText(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
