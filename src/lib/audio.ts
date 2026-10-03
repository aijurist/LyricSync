export const WHISPER_SAMPLE_RATE = 16_000;

/**
 * Decode any browser-supported audio file to 16 kHz mono PCM, the input
 * format Whisper expects. Runs entirely in the browser.
 */
export async function decodeAudio(file: Blob, sampleRate = WHISPER_SAMPLE_RATE): Promise<Float32Array> {
  const data = await file.arrayBuffer();
  // An OfflineAudioContext resamples to its own rate while decoding and needs no user gesture
  const ctx = new OfflineAudioContext(1, 1, sampleRate);
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(data);
  } catch {
    throw new Error("This browser couldn't decode the file. Try converting it to MP3 or WAV.");
  }
  return toMono(buffer);
}

function toMono(buffer: AudioBuffer): Float32Array {
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
