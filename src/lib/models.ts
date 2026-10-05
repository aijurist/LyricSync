export type ModelSize = 'tiny' | 'base' | 'small' | 'turbo';

type Dtype = string | Record<string, string>;

export interface ModelInfo {
  id: ModelSize;
  label: string;
  /** Export with cross-attention outputs, needed for word-level timing */
  repo: string;
  /** Plain export used if the timestamped one can't be loaded (timing is then estimated per word) */
  fallbackRepo: string;
  /** Approximate one-time download, cached by the browser afterwards. */
  download: string;
  description: string;
  dtype: { webgpu: Dtype; wasm: Dtype };
  /** Too slow to be practical without a GPU */
  needsGPU?: boolean;
}

export const MODELS: ModelInfo[] = [
  {
    id: 'tiny',
    label: 'Tiny',
    repo: 'onnx-community/whisper-tiny_timestamped',
    fallbackRepo: 'onnx-community/whisper-tiny',
    download: '~60 MB',
    description: 'Fastest, lowest accuracy',
    dtype: { webgpu: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, wasm: { encoder_model: 'fp32', decoder_model_merged: 'q8' } },
  },
  {
    id: 'base',
    label: 'Base',
    repo: 'onnx-community/whisper-base_timestamped',
    fallbackRepo: 'onnx-community/whisper-base',
    download: '~120 MB',
    description: 'Fast, okay for clear vocals',
    dtype: { webgpu: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, wasm: { encoder_model: 'fp32', decoder_model_merged: 'q8' } },
  },
  {
    id: 'small',
    label: 'Small',
    repo: 'onnx-community/whisper-small_timestamped',
    fallbackRepo: 'onnx-community/whisper-small',
    download: '~400 MB',
    description: 'Good accuracy; the best choice without a GPU',
    dtype: { webgpu: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, wasm: { encoder_model: 'q8', decoder_model_merged: 'q8' } },
  },
  {
    id: 'turbo',
    label: 'Large v3 Turbo',
    repo: 'onnx-community/whisper-large-v3-turbo_timestamped',
    fallbackRepo: 'onnx-community/whisper-large-v3-turbo',
    download: '~1 GB',
    description: 'Most accurate by far, especially on songs. Needs WebGPU',
    dtype: { webgpu: { encoder_model: 'fp16', decoder_model_merged: 'q4' }, wasm: { encoder_model: 'q8', decoder_model_merged: 'q8' } },
    needsGPU: true,
  },
];

export const modelInfo = (id: ModelSize) => MODELS.find((m) => m.id === id) ?? MODELS[2];

export const recommendedModel = (webgpu: boolean | null): ModelSize => (webgpu ? 'turbo' : 'small');
