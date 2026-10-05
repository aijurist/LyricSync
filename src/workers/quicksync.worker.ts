/// <reference lib="webworker" />
import { quickSync } from '@/lib/quicksync';

self.onmessage = (event: MessageEvent<{ lyrics: string; audio: Float32Array }>) => {
  try {
    const result = quickSync(event.data.lyrics, event.data.audio);
    self.postMessage({ type: 'result', chunks: result.chunks });
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
