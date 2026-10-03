import type { ModelSize } from '@/lib/models';

export interface Word {
  word: string;
  timestamp: [number, number];
}

export interface LyricChunk {
  text: string;
  timestamp: [number, number];
  words?: Word[];
}

export interface TranscriptionResult {
  text: string;
  chunks: LyricChunk[];
}

export interface TranscriptionMeta {
  language?: string;
  duration?: number;
  model?: string;
  device?: 'webgpu' | 'wasm';
  /** false when timing came from segments and word times are estimated */
  wordLevel?: boolean;
  processingSeconds?: number;
}

export interface TranscribeOptions {
  language: string;
  model: ModelSize;
}

export interface ABLoop {
  a: number | null;
  b: number | null;
}
