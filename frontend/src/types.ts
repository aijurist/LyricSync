export interface LyricChunk {
  text: string;
  timestamp: [number, number];
}

export interface TranscriptionResult {
  text: string;
  chunks: LyricChunk[];
}