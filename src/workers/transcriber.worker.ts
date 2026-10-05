/// <reference lib="webworker" />
import { BaseStreamer, env, pipeline, type ProgressInfo } from '@huggingface/transformers';
import type { RawChunk } from '@/lib/segment';
import type { WorkerRequest, WorkerResponse, Device } from './protocol';

env.allowLocalModels = false;
env.useBrowserCache = true;

const CHUNK_SECONDS = 30;
const STRIDE_SECONDS = 5;
const SAMPLE_RATE = 16_000;

type Transcriber = Awaited<ReturnType<typeof loadPipeline>>;

let loaded: { repo: string; device: Device; transcriber: Transcriber } | null = null;

const post = (message: WorkerResponse) => self.postMessage(message);

async function hasWebGPU(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return !!(gpu && (await gpu.requestAdapter()));
  } catch {
    return false;
  }
}

type ModelRequest = Pick<WorkerRequest, 'repo' | 'fallbackRepo' | 'dtype'>;

function loadPipeline(repo: string, device: Device, dtype: ModelRequest['dtype']) {
  return pipeline('automatic-speech-recognition', repo, {
    device,
    dtype: dtype[device] as never,
    progress_callback: (info: ProgressInfo) => {
      if (info.status === 'progress_total') {
        post({ type: 'download', progress: info.progress / 100, loaded: info.loaded, total: info.total });
      }
    },
  });
}

/** Load the word-timing export, falling back to the plain export if it isn't available. */
async function loadModel(model: ModelRequest, device: Device): Promise<Transcriber> {
  try {
    return await loadPipeline(model.repo, device, model.dtype);
  } catch (err) {
    if (!/404|not found|could not locate/i.test(String((err as Error)?.message ?? err))) throw err;
    console.warn(`${model.repo} unavailable, using ${model.fallbackRepo}`, err);
    return loadPipeline(model.fallbackRepo, device, model.dtype);
  }
}

async function getTranscriber(model: ModelRequest): Promise<{ transcriber: Transcriber; device: Device }> {
  const repo = model.repo;
  if (loaded?.repo === repo) return loaded;
  post({ type: 'status', status: 'loading' });

  await (loaded?.transcriber as { dispose?: () => Promise<void> } | undefined)?.dispose?.();
  loaded = null;

  let device: Device = (await hasWebGPU()) ? 'webgpu' : 'wasm';
  let transcriber: Transcriber;
  try {
    transcriber = await loadModel(model, device);
  } catch (err) {
    if (device !== 'webgpu') throw err;
    // Some GPUs/drivers fail to initialise; the CPU backend always works
    console.warn('WebGPU initialisation failed, falling back to WASM', err);
    device = 'wasm';
    transcriber = await loadModel(model, device);
  }
  loaded = { repo, device, transcriber };
  return loaded;
}

/** Counts finished 30s windows so we can report real progress. */
class ProgressStreamer extends BaseStreamer {
  private done = 0;
  private total: number;
  constructor(total: number) {
    super();
    this.total = total;
  }
  put() {}
  end() {
    this.done++;
    post({ type: 'progress', progress: Math.min(1, this.done / this.total) });
  }
}

function windowCount(samples: number) {
  const window = CHUNK_SECONDS * SAMPLE_RATE;
  const jump = (CHUNK_SECONDS - 2 * STRIDE_SECONDS) * SAMPLE_RATE;
  return samples <= window ? 1 : Math.ceil((samples - window) / jump) + 1;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type !== 'transcribe') return;

  try {
    const { transcriber, device } = await getTranscriber(request);
    post({ type: 'status', status: 'transcribing', device });

    const options = {
      chunk_length_s: CHUNK_SECONDS,
      stride_length_s: STRIDE_SECONDS,
      task: 'transcribe',
      ...(request.language ? { language: request.language } : {}),
    };

    let output;
    let wordLevel = true;
    try {
      output = await transcriber(request.audio, {
        ...options,
        return_timestamps: 'word',
        // The typings expect a TextStreamer, but generate() only calls put()/end()
        streamer: new ProgressStreamer(windowCount(request.audio.length)) as never,
      });
    } catch (err) {
      const message = String((err as Error)?.message ?? err);
      if (!/alignment_heads|cross_attentions|token_timestamps/i.test(message)) throw err;
      // Model lacks word-timing outputs: fall back to segment timestamps
      wordLevel = false;
      output = await transcriber(request.audio, {
        ...options,
        return_timestamps: true,
        // The typings expect a TextStreamer, but generate() only calls put()/end()
        streamer: new ProgressStreamer(windowCount(request.audio.length)) as never,
      });
    }

    const result = Array.isArray(output) ? output[0] : output;
    post({
      type: 'result',
      chunks: (result.chunks ?? []) as RawChunk[],
      text: result.text,
      wordLevel,
      device,
    });
  } catch (err) {
    post({ type: 'error', message: friendlyError(err) });
  }
};

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (!loaded && /fetch|network|load failed|404|403/i.test(message)) {
    return "Couldn't download the Whisper model. Check your internet connection — it's only needed the first time, after that the model is cached.";
  }
  if (/memory|allocation|OOM/i.test(message)) {
    return 'Ran out of memory. Try a smaller model or close other tabs.';
  }
  return message;
}
