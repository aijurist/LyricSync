export type ModelSize = 'tiny' | 'base' | 'small';

export interface ModelInfo {
  id: ModelSize;
  label: string;
  repo: string;
  /** Approximate one-time download, cached by the browser afterwards. */
  download: string;
  description: string;
}

// "_timestamped" exports include the cross-attention outputs Whisper needs for word timing.
export const MODELS: ModelInfo[] = [
  {
    id: 'tiny',
    label: 'Tiny',
    repo: 'onnx-community/whisper-tiny_timestamped',
    download: '~60 MB',
    description: 'Fastest, good for clear vocals',
  },
  {
    id: 'base',
    label: 'Base',
    repo: 'onnx-community/whisper-base_timestamped',
    download: '~120 MB',
    description: 'Balanced speed and accuracy',
  },
  {
    id: 'small',
    label: 'Small',
    repo: 'onnx-community/whisper-small_timestamped',
    download: '~400 MB',
    description: 'Most accurate, best with WebGPU',
  },
];

export const modelInfo = (id: ModelSize) => MODELS.find((m) => m.id === id) ?? MODELS[1];
