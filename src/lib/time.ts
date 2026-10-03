/** 75.4 -> "01:15" */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** 75.4 -> "01:15.40" (centisecond precision, as used by LRC) */
export function formatPreciseTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const totalCs = Math.round(seconds * 100);
  const mins = Math.floor(totalCs / 6000);
  const secs = Math.floor((totalCs % 6000) / 100);
  const cs = totalCs % 100;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** 3725.5 -> "01:02:05,500" (SRT) or "01:02:05.500" (VTT) */
export function formatClockTime(seconds: number, separator: ',' | '.'): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const totalMs = Math.round(seconds * 1000);
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${separator}${String(ms).padStart(3, '0')}`;
}

/**
 * Parse "ss", "mm:ss", "mm:ss.cc" or "hh:mm:ss.mmm" (comma also accepted).
 * Returns null for anything that isn't a valid, non-negative time.
 */
export function parseTime(input: string): number | null {
  const value = input.trim().replace(',', '.');
  if (!/^\d+(:\d+){0,2}(\.\d+)?$/.test(value)) return null;
  const parts = value.split(':');
  const seconds = parseFloat(parts.pop()!);
  let total = seconds;
  let multiplier = 60;
  while (parts.length) {
    total += parseInt(parts.pop()!, 10) * multiplier;
    multiplier *= 60;
  }
  return Number.isFinite(total) ? Math.round(total * 1000) / 1000 : null;
}
