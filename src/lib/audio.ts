export const WHISPER_SAMPLE_RATE = 16_000;

export interface DecodeOptions {
  /** Cut rumble/bass below the vocal range and normalise loudness */
  enhanceVocals?: boolean;
}

/**
 * Decode any browser-supported audio file to 16 kHz mono PCM, the input
 * format Whisper expects. Runs entirely in the browser.
 */
export async function decodeAudio(file: Blob, { enhanceVocals = true }: DecodeOptions = {}): Promise<Float32Array> {
  const data = await file.arrayBuffer();
  // An OfflineAudioContext resamples to its own rate while decoding and needs no user gesture
  const decoder = new OfflineAudioContext(1, 1, WHISPER_SAMPLE_RATE);
  let buffer: AudioBuffer;
  try {
    buffer = await decoder.decodeAudioData(data);
  } catch {
    throw new Error("This browser couldn't decode the file. Try converting it to MP3 or WAV.");
  }
  if (enhanceVocals) buffer = await filterVocalBand(buffer);
  const mono = toMono(buffer);
  if (enhanceVocals) normalize(mono);
  return mono;
}

/** High-pass away bass and kick drums, which carry no lyric information but dominate many mixes. */
async function filterVocalBand(buffer: AudioBuffer): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 120;
  highpass.Q.value = 0.7;
  // Gentle presence boost where vocal consonants live
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 3000;
  presence.Q.value = 0.8;
  presence.gain.value = 3;
  source.connect(highpass).connect(presence).connect(ctx.destination);
  source.start();
  return ctx.startRendering();
}

function toMono(buffer: AudioBuffer): Float32Array {
  // Lead vocals are almost always panned centre, so the mid (L+R) signal keeps them intact
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const channel = buffer.getChannelData(c);
    for (let i = 0; i < channel.length; i++) out[i] += channel[i];
  }
  const scale = 1 / buffer.numberOfChannels;
  for (let i = 0; i < out.length; i++) out[i] *= scale;
  return out;
}

/** Scale to a consistent peak so quiet recordings aren't under-transcribed. */
export function normalize(samples: Float32Array, targetPeak = 0.95) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
  }
  if (peak < 1e-4) return;
  const gain = targetPeak / peak;
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
}
