import { useCallback, useEffect, useRef, useState } from 'react';
import { alignLyrics } from '@/lib/align';
import { decodeAudio, WHISPER_SAMPLE_RATE } from '@/lib/audio';
import { modelInfo } from '@/lib/models';
import { segmentsToLines, segmentWords } from '@/lib/segment';
import type { LyricChunk, TranscribeOptions, TranscriptionMeta } from '@/types';
import type { Device, WorkerRequest, WorkerResponse } from '@/workers/protocol';

export type JobPhase = 'idle' | 'decoding' | 'loading' | 'transcribing' | 'syncing';

export interface JobState {
  phase: JobPhase;
  /** 0–1, or null when progress is unknown */
  progress: number | null;
  startedAt: number;
  device?: Device;
}

export const IDLE_JOB: JobState = { phase: 'idle', progress: null, startedAt: 0 };

export interface TranscriptionOutput {
  chunks: LyricChunk[];
  meta: TranscriptionMeta;
}

interface CachedTranscription extends TranscriptionOutput {
  key: string;
}

const createWhisperWorker = () =>
  new Worker(new URL('../workers/transcriber.worker.ts', import.meta.url), { type: 'module' });
const createQuickSyncWorker = () =>
  new Worker(new URL('../workers/quicksync.worker.ts', import.meta.url), { type: 'module' });

const cancelled = () => new DOMException('Transcription cancelled', 'AbortError');

function cacheKey(file: Blob, options: TranscribeOptions) {
  const f = file as File;
  return [f.name, f.size, f.lastModified, options.model, options.language, options.enhanceVocals].join('|');
}

/**
 * Runs Whisper (or the model-free quick sync) in Web Workers so the UI stays
 * responsive. Nothing leaves the device: audio is decoded locally and the
 * model runs on WebGPU or WASM.
 */
export function useTranscriber() {
  const whisperRef = useRef<Worker | null>(null);
  const quickRef = useRef<Worker | null>(null);
  const rejectRef = useRef<((reason: unknown) => void) | null>(null);
  const cacheRef = useRef<CachedTranscription | null>(null);
  const [job, setJob] = useState<JobState>(IDLE_JOB);
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(
    () => () => {
      whisperRef.current?.terminate();
      quickRef.current?.terminate();
    },
    [],
  );

  const cancel = useCallback(() => {
    // Terminating is the only way to stop work mid-run; the model reloads from cache next time
    whisperRef.current?.terminate();
    whisperRef.current = null;
    quickRef.current?.terminate();
    quickRef.current = null;
    rejectRef.current?.(cancelled());
    rejectRef.current = null;
    setJob(IDLE_JOB);
  }, []);

  /** Run Whisper on the file, reusing the last result for the same file and settings. */
  const runWhisper = useCallback(async (file: Blob, options: TranscribeOptions, startedAt: number) => {
    const key = cacheKey(file, options);
    if (cacheRef.current?.key === key) return cacheRef.current;

    setJob({ phase: 'decoding', progress: null, startedAt });
    const audio = await decodeAudio(file, { enhanceVocals: options.enhanceVocals });
    const duration = audio.length / WHISPER_SAMPLE_RATE;
    const worker = (whisperRef.current ??= createWhisperWorker());
    const model = modelInfo(options.model);

    const output = await new Promise<TranscriptionOutput>((resolve, reject) => {
      rejectRef.current = reject;
      worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        switch (data.type) {
          case 'status':
            if (data.device) setDevice(data.device);
            setJob((j) => ({
              ...j,
              phase: data.status,
              progress: data.status === 'transcribing' ? 0 : null,
              device: data.device ?? j.device,
            }));
            break;
          case 'download':
            setJob((j) => ({ ...j, phase: 'loading', progress: data.progress }));
            break;
          case 'progress':
            setJob((j) => ({ ...j, progress: data.progress }));
            break;
          case 'result':
            setDevice(data.device);
            resolve({
              chunks: data.wordLevel ? segmentWords(data.chunks) : segmentsToLines(data.chunks),
              meta: {
                model: model.label,
                device: data.device,
                wordLevel: data.wordLevel,
                duration,
                language: options.language === 'auto' ? undefined : options.language,
                source: 'ai',
              },
            });
            break;
          case 'error':
            reject(new Error(data.message));
            break;
        }
      };
      worker.onerror = (e) => reject(new Error(e.message || 'The transcription worker crashed.'));

      const request: WorkerRequest = {
        type: 'transcribe',
        audio,
        repo: model.repo,
        fallbackRepo: model.fallbackRepo,
        dtype: model.dtype,
        language: options.language === 'auto' ? null : options.language,
      };
      worker.postMessage(request, [audio.buffer]);
    });

    cacheRef.current = { key, ...output };
    return output;
  }, []);

  /**
   * Transcribe with Whisper. With `lyrics`, the given text is used instead of
   * the recognised words and only the timing comes from the model.
   */
  const transcribe = useCallback(
    async (file: Blob, options: TranscribeOptions, lyrics?: string): Promise<TranscriptionOutput> => {
      const startedAt = Date.now();
      try {
        const ai = await runWhisper(file, options, startedAt);
        const processingSeconds = (Date.now() - startedAt) / 1000;
        if (!lyrics?.trim()) return { chunks: ai.chunks, meta: { ...ai.meta, processingSeconds } };

        setJob({ phase: 'syncing', progress: null, startedAt });
        const { chunks, matchRate } = alignLyrics(lyrics, ai.chunks, ai.meta.duration);
        return { chunks, meta: { ...ai.meta, source: 'ai+lyrics', matchRate, wordLevel: true, processingSeconds } };
      } finally {
        rejectRef.current = null;
        setJob(IDLE_JOB);
      }
    },
    [runWhisper],
  );

  /** Model-free sync: align the lyrics' syllables to onsets detected in the audio. */
  const quickSync = useCallback(
    async (file: Blob, options: TranscribeOptions, lyrics: string): Promise<TranscriptionOutput> => {
      const startedAt = Date.now();
      setJob({ phase: 'decoding', progress: null, startedAt });
      try {
        const audio = await decodeAudio(file, { enhanceVocals: options.enhanceVocals });
        const duration = audio.length / WHISPER_SAMPLE_RATE;
        setJob({ phase: 'syncing', progress: null, startedAt });
        const worker = (quickRef.current ??= createQuickSyncWorker());
        const chunks = await new Promise<LyricChunk[]>((resolve, reject) => {
          rejectRef.current = reject;
          worker.onmessage = ({ data }) => (data.type === 'result' ? resolve(data.chunks) : reject(new Error(data.message)));
          worker.onerror = (e) => reject(new Error(e.message || 'The sync worker crashed.'));
          worker.postMessage({ lyrics, audio }, [audio.buffer]);
        });
        return {
          chunks,
          meta: { source: 'quick', duration, wordLevel: true, processingSeconds: (Date.now() - startedAt) / 1000 },
        };
      } finally {
        rejectRef.current = null;
        setJob(IDLE_JOB);
      }
    },
    [],
  );

  return { job, device, transcribe, quickSync, cancel };
}
