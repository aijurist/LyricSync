import type { RawChunk } from '@/lib/segment';

export type Device = 'webgpu' | 'wasm';

export type WorkerRequest = {
  type: 'transcribe';
  audio: Float32Array;
  repo: string;
  fallbackRepo: string;
  dtype: { webgpu: string | Record<string, string>; wasm: string | Record<string, string> };
  /** ISO code, or null to auto-detect */
  language: string | null;
};

export type WorkerResponse =
  | { type: 'status'; status: 'loading' | 'transcribing'; device?: Device }
  | { type: 'download'; progress: number; loaded: number; total: number }
  | { type: 'progress'; progress: number }
  | { type: 'result'; chunks: RawChunk[]; text: string; wordLevel: boolean; device: Device }
  | { type: 'error'; message: string };
