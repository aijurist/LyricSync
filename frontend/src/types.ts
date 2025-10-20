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