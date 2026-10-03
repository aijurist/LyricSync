import { useCallback, useEffect, useRef, useState } from 'react';
import { decodeAudio } from '@/lib/audio';
import { modelInfo } from '@/lib/models';
import { segmentsToLines, segmentWords } from '@/lib/segment';
import type { LyricChunk, TranscribeOptions, TranscriptionMeta } from '@/types';
import type { Device, WorkerRequest, WorkerResponse } from '@/workers/protocol';

export type JobPhase = 'idle' | 'decoding' | 'loading' | 'transcribing';

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

const createWorker = () =>
  new Worker(new URL('../workers/transcriber.worker.ts', import.meta.url), { type: 'module' });

/**
 * Runs Whisper in a Web Worker so the UI stays responsive. Nothing leaves the
 * device: audio is decoded locally and the model runs on WebGPU or WASM.
 */
export function useTranscriber() {
  const workerRef = useRef<Worker | null>(null);
  const rejectRef = useRef<((reason: unknown) => void) | null>(null);
  const [job, setJob] = useState<JobState>(IDLE_JOB);
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const cancel = useCallback(() => {
    // Terminating is the only way to stop inference mid-run; the model reloads from cache next time
    workerRef.current?.terminate();
    workerRef.current = null;
    rejectRef.current?.(new DOMException('Transcription cancelled', 'AbortError'));
    rejectRef.current = null;
    setJob(IDLE_JOB);
  }, []);

  const transcribe = useCallback(async (file: Blob, options: TranscribeOptions): Promise<TranscriptionOutput> => {
    const startedAt = Date.now();
    setJob({ phase: 'decoding', progress: null, startedAt });

    try {
      const audio = await decodeAudio(file);
      const duration = audio.length / 16_000;
      const worker = (workerRef.current ??= createWorker());
      const model = modelInfo(options.model);

      const output = await new Promise<TranscriptionOutput>((resolve, reject) => {
        rejectRef.current = reject;
        worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
          switch (data.type) {
            case 'status':
              if (data.device) setDevice(data.device);
              setJob((j) => ({ ...j, phase: data.status, progress: data.status === 'transcribing' ? 0 : null, device: data.device ?? j.device }));
              break;
            case 'download':
              setJob((j) => ({ ...j, phase: 'loading', progress: data.progress }));
              break;
            case 'progress':
              setJob((j) => ({ ...j, progress: data.progress }));
              break;
            case 'result': {
              setDevice(data.device);
              const chunks = data.wordLevel ? segmentWords(data.chunks) : segmentsToLines(data.chunks);
              resolve({
                chunks,
                meta: {
                  model: model.label,
                  device: data.device,
                  wordLevel: data.wordLevel,
                  duration,
                  language: options.language === 'auto' ? undefined : options.language,
                  processingSeconds: (Date.now() - startedAt) / 1000,
                },
              });
              break;
            }
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
          language: options.language === 'auto' ? null : options.language,
        };
        worker.postMessage(request, [audio.buffer]);
      });
      return output;
    } finally {
      rejectRef.current = null;
      setJob(IDLE_JOB);
    }
  }, []);

  return { job, device, transcribe, cancel };
}
